import prisma from "../config/db";
import { OrderStatus, OrderType, Prisma } from "@prisma/client";
import budgetRepository from "./budgetRepository";
import { calculateShippingFee } from "../constants/order";

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

type MonthRange = { yearMonth: string; from: Date; to: Date };

// 카테고리 스냅샷은 "상위>하위" 형태로 저장한다
function formatCategoryName(category: {
  name: string;
  parent: { name: string } | null;
}) {
  return category.parent
    ? `${category.parent.name}>${category.name}`
    : category.name;
}

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
  orderBy:
    | Prisma.OrderOrderByWithRelationInput
    | Prisma.OrderOrderByWithRelationInput[];
}) {
  const { where, skip, take, orderBy } = params;

  return prisma.order.findMany({
    where,
    include: {
      requester: { select: { name: true } },
      processor: { select: { name: true } },
      orderItems: {
        select: { productName: true, quantity: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
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
          productId: true,
          productName: true,
          imageUrl: true,
          categoryName: true,
          quantity: true,
          unitPrice: true,
          subtotal: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
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

// 선택한 월의 승인 주문 금액과 카테고리별 상품 금액 집계
async function aggregateApprovedMonthlySpending(params: {
  companyId: string;
  from: Date;
  to: Date;
}) {
  const { companyId, from, to } = params;
  const approvedOrderWhere = {
    companyId,
    status: OrderStatus.APPROVED,
    approvedAt: { gte: from, lt: to },
  };

  const [totals, categories] = await Promise.all([
    prisma.order.aggregate({
      where: approvedOrderWhere,
      _sum: {
        totalPrice: true,
        productAmount: true,
        shippingFee: true,
      },
    }),
    prisma.orderItem.groupBy({
      by: ["categoryName"],
      where: { order: approvedOrderWhere },
      _sum: { subtotal: true },
    }),
  ]);

  return {
    spent: totals._sum.totalPrice ?? 0,
    productAmount: totals._sum.productAmount ?? 0,
    shippingFee: totals._sum.shippingFee ?? 0,
    categories: categories.map((category) => ({
      name: category.categoryName.trim() || "기타",
      amount: category._sum.subtotal ?? 0,
    })),
  };
}

// 같은 회사의 지출 확정을 직렬화해 예산 검증이 경쟁 조건에 뚫리지 않게 한다
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

// 확정하려는 금액이 해당 월 예산에 들어가는지 검사 (승인/즉시구매 공용)
async function checkMonthlyBudget(
  tx: Prisma.TransactionClient,
  params: {
    companyId: string;
    monthRange: MonthRange;
    amount: number;
    defaultMonthlyBudget: number;
  },
) {
  const { companyId, monthRange, amount, defaultMonthlyBudget } = params;

  // 해당 월 예산이 없으면 회사 기본 월 예산을 기준으로 삼는다
  const budget =
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

  // 0 이하면 미설정/무제한으로 보고 예산 검증을 건너뛴다
  const withinBudget = budget <= 0 || spent + amount <= budget;

  return { withinBudget, budget, spent };
}

async function incrementPurchaseCounts(
  tx: Prisma.TransactionClient,
  items: { productId: string; quantity: number }[],
) {
  await Promise.all(
    items.map((item) =>
      tx.product.update({
        where: { id: item.productId },
        data: { purchaseCount: { increment: item.quantity } },
      }),
    ),
  );
}

async function snapshotOrderItems(
  tx: Prisma.TransactionClient,
  orderItems: OrderItemWithProduct[],
) {
  await Promise.all(
    orderItems.map((item) =>
      tx.orderItem.update({
        where: { id: item.id },
        data: {
          productName: item.product.name,
          imageUrl: item.product.imageUrl,
          categoryName: formatCategoryName(item.product.category),
        },
      }),
    ),
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
  monthRange: MonthRange;
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

      const { withinBudget, budget, spent } = await checkMonthlyBudget(tx, {
        companyId,
        monthRange,
        amount: pendingOrder.totalPrice,
        defaultMonthlyBudget,
      });

      if (!withinBudget) {
        return { status: "BUDGET_EXCEEDED" as const, budget, spent };
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
        incrementPurchaseCounts(tx, orderItems),
      ]);

      return { status: "APPROVED" as const, order };
    },
    { timeout: 10000 },
  );
}

// 본인 장바구니 항목을 읽고 주문 항목(스냅샷 포함)으로 변환한다
async function resolveCartItemsToOrderItems(
  tx: Prisma.TransactionClient,
  params: { userId: string; companyId: string; cartItemIds: string[] },
) {
  const { userId, companyId, cartItemIds } = params;

  const cartItems = await tx.cartItem.findMany({
    where: { id: { in: cartItemIds }, userId },
    include: {
      product: { include: { category: { include: { parent: true } } } },
    },
  });

  if (cartItems.length !== cartItemIds.length) {
    return { status: "CART_ITEM_NOT_FOUND" as const };
  }

  // 다른 회사 상품이 섞이면 지출 집계가 어긋나므로 막는다
  if (cartItems.some((item) => item.product.companyId !== companyId)) {
    return { status: "PRODUCT_NOT_FOUND" as const };
  }

  // findMany 결과는 순서가 없으므로 요청한 cartItemIds 순서를 유지한다
  const cartItemById = new Map(cartItems.map((item) => [item.id, item]));
  const orderedCartItems = cartItemIds.map((id) => cartItemById.get(id)!);

  // 금액·스냅샷은 요청/구매 시점의 상품 정보로 확정한다
  const items = orderedCartItems.map((item) => ({
    productId: item.productId,
    unitPrice: item.product.price,
    quantity: item.quantity,
    subtotal: item.product.price * item.quantity,
    productName: item.product.name,
    imageUrl: item.product.imageUrl,
    categoryName: formatCategoryName(item.product.category),
  }));

  return { status: "OK" as const, items };
}

// 즉시구매 (장바구니 항목으로 주문을 만들고 바로 확정, 월 예산 검증 포함)
async function createDirectOrder(params: {
  userId: string;
  companyId: string;
  cartItemIds: string[];
  monthRange: MonthRange;
}) {
  const { userId, companyId, cartItemIds, monthRange } = params;

  return prisma.$transaction(
    async (tx) => {
      const defaultMonthlyBudget = await lockCompanyForApproval(tx, companyId);

      const resolved = await resolveCartItemsToOrderItems(tx, {
        userId,
        companyId,
        cartItemIds,
      });

      if (resolved.status !== "OK") {
        return resolved;
      }

      const { items } = resolved;
      const productAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
      const shippingFee = calculateShippingFee(productAmount);
      const totalPrice = productAmount + shippingFee;

      const { withinBudget, budget, spent } = await checkMonthlyBudget(tx, {
        companyId,
        monthRange,
        amount: totalPrice,
        defaultMonthlyBudget,
      });

      if (!withinBudget) {
        return { status: "BUDGET_EXCEEDED" as const, budget, spent };
      }

      const order = await tx.order.create({
        data: {
          companyId,
          requesterId: userId,
          processorId: userId,
          type: OrderType.DIRECT,
          status: OrderStatus.APPROVED,
          productAmount,
          shippingFee,
          totalPrice,
          approvedAt: new Date(),
          orderItems: { create: items },
        },
      });

      await Promise.all([
        incrementPurchaseCounts(tx, items),
        tx.cartItem.deleteMany({ where: { id: { in: cartItemIds }, userId } }),
      ]);

      // 대표 상품은 DB include 순서가 아니라 요청 배열 첫 항목을 사용한다
      const firstItem = items[0];

      return {
        status: "CREATED" as const,
        order,
        firstItem: {
          productName: firstItem.productName,
          categoryName: firstItem.categoryName,
        },
        itemCount: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      };
    },
    { timeout: 10000 },
  );
}

// 구매 요청 생성 (PENDING, 예산 검증·purchaseCount 없음, 생성 시 스냅샷)
async function createPurchaseRequest(params: {
  userId: string;
  companyId: string;
  cartItemIds: string[];
  requestMessage?: string;
}) {
  const { userId, companyId, cartItemIds, requestMessage } = params;

  try {
    return await prisma.$transaction(
      async (tx) => {
        const resolved = await resolveCartItemsToOrderItems(tx, {
          userId,
          companyId,
          cartItemIds,
        });

        if (resolved.status !== "OK") {
          return resolved;
        }

        // 주문을 만들기 전에 장바구니를 선점한다.
        // 삭제 개수가 부족하면 다른 요청이 먼저 가져간 것이므로 중단한다.
        const deleted = await tx.cartItem.deleteMany({
          where: { id: { in: cartItemIds }, userId },
        });

        if (deleted.count !== cartItemIds.length) {
          // 일부만 지워진 채 커밋되지 않도록 롤백한다
          throw new Error("CART_ITEM_CLAIM_CONFLICT");
        }

        const { items } = resolved;
        const productAmount = items.reduce(
          (sum, item) => sum + item.subtotal,
          0,
        );
        const shippingFee = calculateShippingFee(productAmount);
        const totalPrice = productAmount + shippingFee;

        const order = await tx.order.create({
          data: {
            companyId,
            requesterId: userId,
            type: OrderType.REQUEST,
            status: OrderStatus.PENDING,
            productAmount,
            shippingFee,
            totalPrice,
            requestMessage,
            orderItems: { create: items },
          },
        });

        // 대표 상품은 DB include 순서가 아니라 요청 배열 첫 항목을 사용한다
        const firstItem = items[0];

        return {
          status: "CREATED" as const,
          order,
          firstItem: {
            productName: firstItem.productName,
            categoryName: firstItem.categoryName,
          },
          itemCount: items.length,
          totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        };
      },
      { timeout: 10000 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "CART_ITEM_CLAIM_CONFLICT") {
      return { status: "CART_ITEM_NOT_FOUND" as const };
    }

    throw error;
  }
}

// 구매 요청 취소 (PENDING → CANCELLED, 상태만 변경)
async function cancelPurchaseRequest(params: {
  orderId: string;
  userId: string;
  companyId: string;
}) {
  const { orderId, userId, companyId } = params;

  try {
    // 본인이 올린 대기 중 구매 요청만 취소할 수 있다
    return await prisma.order.update({
      where: {
        id: orderId,
        companyId,
        requesterId: userId,
        type: OrderType.REQUEST,
        status: OrderStatus.PENDING,
      },
      data: { status: OrderStatus.CANCELLED },
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
  aggregateApprovedMonthlySpending,
  createDirectOrder,
  createPurchaseRequest,
  cancelPurchaseRequest,
  updateOrderToApproved,
  updateOrderToRejected,
};
