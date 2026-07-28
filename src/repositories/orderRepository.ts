import prisma from "../config/db";
import { OrderStatus, Prisma } from "@prisma/client";

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

// 구매 내역 목록 조회
async function findOrderHistory(params: {
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

// 구매 내역 개수 조회
async function countOrderHistory(where: Prisma.OrderWhereInput) {
  return prisma.order.count({ where });
}

// 구매 내역 상세 조회
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

// 구매 승인
async function updateOrderToApproved(params: {
  orderId: string;
  processorId: string;
  responseMessage?: string;
}) {
  const { orderId, processorId, responseMessage } = params;

  return prisma.$transaction(
    async (tx) => {
      const order = await updatePendingOrderStatus(tx, {
        orderId,
        status: OrderStatus.APPROVED,
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

      return order;
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
  findOrderHistory,
  countOrderHistory,
  findOrderDetailById,
  updateOrderToApproved,
  updateOrderToRejected,
};
