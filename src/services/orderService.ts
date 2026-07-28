import orderRepository from "../repositories/orderRepository";
import AppError from "../utils/appError";
import { ErrorCodes } from "../constants/errorCodes";
import { OrderStatus, OrderType } from "@prisma/client";

async function getOrderHistory(params: {
  companyId: string;
  page: number;
  limit: number;
  sort?: string;
}) {
  const { companyId, page, limit, sort } = params;

  const { totalCount, orders } = await orderRepository.findOrderHistoryList({
    companyId,
    page,
    limit,
    sort,
  });

  const data = orders.map((order) => {
    const itemCount = order.orderItems.length;
    return {
      id: order.id,
      approvedAt: order.approvedAt,
      totalPrice: order.totalPrice,
      requesterName: order.requester?.name,
      processorName: order.processor?.name,
      createdAt: order.createdAt,
      itemsSummary: {
        firstProductName:
          itemCount > 0 ? order.orderItems[0].productName : null,
        itemCount,
      },
    };
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    data,
    pagination: {
      totalCount,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
    },
  };
}

// 구매 상세 내역 조회
async function getOrderDetail(params: { orderId: string; companyId: string }) {
  const { orderId, companyId } = params;
  const order = await orderRepository.findOrderById(orderId);

  if (!order) {
    throw new AppError(ErrorCodes.ORDER.NOT_FOUND);
  }

  if (order.companyId !== companyId) {
    throw new AppError(ErrorCodes.ORDER.UNAUTHORIZED_ACCESS);
  }

  if (order.status !== OrderStatus.APPROVED) {
    throw new AppError(ErrorCodes.ORDER.NOT_FOUND);
  }

  const items = order.orderItems.map((item) => ({
    productName: item.productName,
    imageUrl: item.imageUrl,
    categoryName: item.categoryName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.subtotal,
  }));

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    orderId: order.id,
    type: order.type,
    status: order.status,
    productAmount: order.productAmount,
    shippingFee: order.shippingFee,
    totalPrice: order.totalPrice,
    totalQuantity,
    requestMessage: order.requestMessage,
    responseMessage: order.responseMessage,
    requestedAt: order.createdAt,
    approvedAt: order.approvedAt,
    requesterName: order.requester?.name,
    processorName: order.processor?.name,
    items,
  };
}

async function getProcessablePurchaseRequest(
  orderId: string,
  companyId: string,
) {
  const order = await orderRepository.findOrderByOrderId(orderId);
  if (!order) {
    throw new AppError(ErrorCodes.ORDER.NOT_FOUND);
  }

  if (order.companyId !== companyId) {
    throw new AppError(ErrorCodes.ORDER.UNAUTHORIZED_ACCESS);
  }

  if (order.type !== OrderType.REQUEST) {
    throw new AppError(ErrorCodes.ORDER.INVALID_ORDER_TYPE);
  }

  if (order.status !== OrderStatus.PENDING) {
    throw new AppError(ErrorCodes.ORDER.INVALID_ORDER_STATUS);
  }

  return order;
}

// 구매 승인
async function approveOrder(params: {
  orderId: string;
  userId: string;
  companyId: string;
  responseMessage?: string;
}) {
  const { orderId, userId, companyId, responseMessage } = params;
  const order = await getProcessablePurchaseRequest(orderId, companyId);

  const approvedOrder = await orderRepository.updateOrderToApproved({
    orderId: order.id,
    processorId: userId,
    responseMessage,
  });

  // 검증 이후 다른 요청이 먼저 처리했다면 갱신 대상이 없다
  if (!approvedOrder) {
    throw new AppError(ErrorCodes.ORDER.INVALID_ORDER_STATUS);
  }

  return approvedOrder;
}

// 구매 반려
async function rejectOrder(params: {
  orderId: string;
  userId: string;
  companyId: string;
  responseMessage?: string;
}) {
  const { orderId, userId, companyId, responseMessage } = params;
  const order = await getProcessablePurchaseRequest(orderId, companyId);

  const rejectedOrder = await orderRepository.updateOrderToRejected({
    orderId: order.id,
    processorId: userId,
    responseMessage,
  });

  // 검증 이후 다른 요청이 먼저 처리했다면 갱신 대상이 없다
  if (!rejectedOrder) {
    throw new AppError(ErrorCodes.ORDER.INVALID_ORDER_STATUS);
  }

  return rejectedOrder;
}

export default {
  getOrderHistory,
  getOrderDetail,
  approveOrder,
  rejectOrder,
};
