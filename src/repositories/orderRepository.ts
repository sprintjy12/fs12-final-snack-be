import prisma from "../config/db";
import { OrderStatus, Prisma } from "@prisma/client";
import budgetRepository from "./budgetRepository";

const orderItemWithProductInclude = {
  product: {
    include: {
      category: {
        include: { parent: true },
      },
    },
  },
} as const;

type OrderItemWithProduct = Prisma.OrderItemGetPayload<{
  include: typeof orderItemWithProductInclude;
}>;

async function findOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
  });
}

// 주문 목록 조회 (구매 내역 / 구매 요청 공용, 조건은 서비스에서 결정)
async function findOrders(params: {
  where: Prisma.OrderWhereInput;
  skip: number;
  take: number;
  orderBy: Prisma.OrderOrderByWithRelationInput;
}) {
  const { where, skip, take, orderBy } = params;

  return prisma.order.findMany({
    where,
    include: {
      requester: { select: { name: true } },
      processor: { select: { name: true } },
      orderItems: { select: { productName: true } },
    },
    orderBy,
    skip,
    take,
  });
}

// 주문 개수 조회
async function countOrders(where: Prisma.OrderWhereInput) {
  return prisma.order.count({ where });
}

// 주문 상세 조회 (요청자/처리자, 주문 상품 포함)
async function findOrderDetailById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      requester: {
        select: { name: true },
      },
      processor: {
        select: { name: true },
      },
      orderItems: {
        select: {
          productName: true,
          imageUrl: true,
          categoryName: true,
          quantity: true,
          unitPrice: true,
          subtotal: true,
        },
      },
    },
  });
}

async function sumApprovedTotal(
  client: Prisma.TransactionClient,
  params: { companyId: string; from: Date; to: Date },
) {
  const { companyId, from, to } = params;

  const result = await client.order.aggregate({
    where: {
      companyId,
      status: OrderStatus.APPROVED,
      approvedAt: { gte: from, lt: to },
    },
    _sum: { totalPrice: true },
  });

  return result._sum.totalPrice ?? 0;
}

// 승인된 주문의 지출 합계 (기간은 서비스에서 결정, 직구매 포함)
async function sumApprovedOrderTotal(params: {
  companyId: string;
  from: Date;
  to: Date;
}) {
  return sumApprovedTotal(prisma, params);
}

// 같은 회사의 승인을 직렬화해 예산 검증이 경쟁 조건에 뚫리지 않게 한다
async function lockCompanyForApproval(
  tx: Prisma.TransactionClient,
  companyId: string,
) {
  const rows = await tx.$queryRaw<{ defaultMonthlyBudget: number }[]>`
    SELECT "defaultMonthlyBudget"
    FROM companies
    WHERE id = ${companyId}::uuid
    FOR UPDATE
  `;

  return rows[0]?.defaultMonthlyBudget ?? 0;
}

async function snapshotOrderItems(
  tx: Prisma.TransactionClient,
  orderItems: OrderItemWithProduct[],
) {
  await Promise.all(
    orderItems.map((item) => {
      const category = item.product.category;
      const categoryName = category.parent
        ? `${category.parent.name}>${category.name}`
        : category.name;

      return tx.orderItem.update({
        where: { id: item.id },
        data: {
          productName: item.product.name,
          imageUrl: item.product.imageUrl,
          categoryName,
        },
      });
    }),
  );
}

// PENDING 상태일 때만 갱신되도록 원자적으로 처리하고, 이미 처리된 주문이면 null 반환
async function updatePendingOrderStatus(
  tx: Prisma.TransactionClient,
  params: {
    orderId: string;
    status: OrderStatus;
    processorId: string;
    responseMessage?: string;
  },
) {
  const { orderId, status, processorId, responseMessage } = params;

  try {
    return await tx.order.update({
      where: { id: orderId, status: OrderStatus.PENDING },
      data: {
        status,
        processorId,
        approvedAt: new Date(),
        responseMessage,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return null;
    }

    throw error;
  }
}

// 구매 승인 (월 예산 검증 포함)
async function updateOrderToApproved(params: {
  orderId: string;
  companyId: string;
  processorId: string;
  responseMessage?: string;
  monthRange: { yearMonth: string; from: Date; to: Date };
}) {
  const { orderId, companyId, processorId, responseMessage, monthRange } =
    params;

  return prisma.$transaction(
    async (tx) => {
      const defaultMonthlyBudget = await lockCompanyForApproval(tx, companyId);

      const pendingOrder = await tx.order.findUnique({
        where: { id: orderId },
        select: { totalPrice: true, status: true },
      });

      if (!pendingOrder || pendingOrder.status !== OrderStatus.PENDING) {
        return { status: "ALREADY_PROCESSED" as const };
      }

      // 해당 월 예산이 없으면 회사 기본 월 예산을 기준으로 삼는다
      const monthlyBudget =
        (await budgetRepository.findBudgetAmountInTx(
          tx,
          companyId,
          monthRange.yearMonth,
        )) ?? defaultMonthlyBudget;

      const spent = await sumApprovedTotal(tx, {
        companyId,
        from: monthRange.from,
        to: monthRange.to,
      });

      if (spent + pendingOrder.totalPrice > monthlyBudget) {
        return {
          status: "BUDGET_EXCEEDED" as const,
          budget: monthlyBudget,
          spent,
        };
      }

      const order = await updatePendingOrderStatus(tx, {
        orderId,
        status: OrderStatus.APPROVED,
        processorId,
        responseMessage,
      });

      if (!order) {
        return { status: "ALREADY_PROCESSED" as const };
      }

      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
        include: orderItemWithProductInclude,
      });

      await Promise.all([
        snapshotOrderItems(tx, orderItems),
        ...orderItems.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: {
              purchaseCount: { increment: item.quantity },
            },
          }),
        ),
      ]);

      return { status: "APPROVED" as const, order };
    },
    { timeout: 10000 },
  );
}

// 구매 반려
async function updateOrderToRejected(params: {
  orderId: string;
  processorId: string;
  responseMessage?: string;
}) {
  const { orderId, processorId, responseMessage } = params;

  return prisma.$transaction(
    async (tx) => {
      const order = await updatePendingOrderStatus(tx, {
        orderId,
        status: OrderStatus.REJECTED,
        processorId,
        responseMessage,
      });

      if (!order) {
        return null;
      }

      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
        include: orderItemWithProductInclude,
      });

      await snapshotOrderItems(tx, orderItems);

      return order;
    },
    { timeout: 10000 },
  );
}

export default {
  findOrderById,
  findOrders,
  countOrders,
  findOrderDetailById,
  sumApprovedOrderTotal,
  updateOrderToApproved,
  updateOrderToRejected,
};
