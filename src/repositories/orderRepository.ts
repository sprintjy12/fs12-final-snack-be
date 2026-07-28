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

async function findOrderByOrderId(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
  });
}

// 구매 내역 조회
async function findOrderHistoryList(params: {
  companyId: string;
  page: number;
  limit: number;
  sort?: string;
}) {
  const { companyId, page, limit, sort = "latest" } = params;
  const skip = (page - 1) * limit;

  let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "highPrice") orderBy = { totalPrice: "desc" };
  if (sort === "lowPrice") orderBy = { totalPrice: "asc" };

  const whereCondition = { companyId, status: OrderStatus.APPROVED };

  const [totalCount, orders] = await Promise.all([
    prisma.order.count({ where: whereCondition }),
    prisma.order.findMany({
      where: whereCondition,
      include: {
        requester: { select: { name: true } },
        processor: { select: { name: true } },
        orderItems: { select: { productName: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  return { totalCount, orders };
}

// 구매 내역 상세 조회
async function findOrderById(orderId: string) {
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
  for (const item of orderItems) {
    const category = item.product.category;
    const categoryName = category.parent
      ? `${category.parent.name}>${category.name}`
      : category.name;

    await tx.orderItem.update({
      where: { id: item.id },
      data: {
        productName: item.product.name,
        imageUrl: item.product.imageUrl,
        categoryName,
      },
    });
  }
}

// 구매 승인
async function updateOrderToApproved(params: {
  orderId: string;
  processorId: string;
  responseMessage?: string;
}) {
  const { orderId, processorId, responseMessage } = params;

  return prisma.$transaction(async (tx) => {
    const orderItems = await tx.orderItem.findMany({
      where: { orderId },
      include: orderItemWithProductInclude,
    });

    const order = await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.APPROVED,
        processorId,
        approvedAt: new Date(),
        responseMessage,
      },
    });

    await snapshotOrderItems(tx, orderItems);

    for (const item of orderItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          purchaseCount: { increment: item.quantity },
        },
      });
    }

    return order;
  });
}

// 구매 반려
async function updateOrderToRejected(params: {
  orderId: string;
  processorId: string;
  responseMessage?: string;
}) {
  const { orderId, processorId, responseMessage } = params;

  return prisma.$transaction(async (tx) => {
    const orderItems = await tx.orderItem.findMany({
      where: { orderId },
      include: orderItemWithProductInclude,
    });

    const order = await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.REJECTED,
        processorId,
        approvedAt: new Date(),
        responseMessage,
      },
    });

    await snapshotOrderItems(tx, orderItems);

    return order;
  });
}

export default {
  findOrderByOrderId,
  findOrderHistoryList,
  findOrderById,
  updateOrderToApproved,
  updateOrderToRejected,
};
