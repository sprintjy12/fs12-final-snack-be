import orderRepository from "../repositories/orderRepository";
import budgetService from "./budgetService";
import AppError from "../utils/appError";
import { ErrorCodes } from "../constants/errorCodes";
import { OrderStatus, OrderType, Prisma } from "@prisma/client";
import { getKstMonthRange, toKstYearMonth } from "../utils/date";

// 정렬
function getOrderBy(sort?: string): Prisma.OrderOrderByWithRelationInput {
  switch (sort) {
    case "highPrice":
      return { totalPrice: "desc" };
    case "lowPrice":
      return { totalPrice: "asc" };
    case "latest":
    default:
      return { createdAt: "desc" };
  }
}

type OrderDetail = NonNullable<
  Awaited<ReturnType<typeof orderRepository.findOrderDetailById>>
>;

// 상세 응답 형태 (구매 내역 / 구매 요청 공용)
function toOrderDetailResponse(order: OrderDetail) {
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
    requesterName: order.requester?.name ?? null,
    processorName: order.processor?.name ?? null,
    items,
  };
}

async function getOrderHistory(params: {
  companyId: string;
  page: number;
  limit: number;
  sort?: string;
}) {
  const { companyId, page, limit, sort } = params;

  // 구매 내역은 승인된 주문만 노출
  const where = { companyId, status: OrderStatus.APPROVED };

  const [totalCount, orders] = await Promise.all([
    orderRepository.countOrders(where),
    orderRepository.findOrders({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: getOrderBy(sort),
    }),
  ]);

  const data = orders.map((order) => {
    const itemCount = order.orderItems.length;
    return {
      id: order.id,
      approvedAt: order.approvedAt,
      totalPrice: order.totalPrice,
      requesterName: order.requester?.name ?? null,
      processorName: order.processor?.name ?? null,
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
  const order = await orderRepository.findOrderDetailById(orderId);

  if (!order) {
    throw new AppError(ErrorCodes.ORDER.NOT_FOUND);
  }

  if (order.companyId !== companyId) {
    throw new AppError(ErrorCodes.ORDER.UNAUTHORIZED_ACCESS);
  }

  if (order.status !== OrderStatus.APPROVED) {
    throw new AppError(ErrorCodes.ORDER.NOT_FOUND);
  }

  return toOrderDetailResponse(order);
}

// 구매 요청 목록 조회 (대기 중인 요청만)
async function getPurchaseRequestList(params: {
  companyId: string;
  page: number;
  limit: number;
  sort?: string;
}) {
  const { companyId, page, limit, sort } = params;

  const where = {
    companyId,
    type: OrderType.REQUEST,
    status: OrderStatus.PENDING,
  };

  const [totalCount, orders] = await Promise.all([
    orderRepository.countOrders(where),
    orderRepository.findOrders({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: getOrderBy(sort),
    }),
  ]);

  const data = orders.map((order) => {
    const itemCount = order.orderItems.length;
    return {
      id: order.id,
      requestedAt: order.createdAt,
      totalPrice: order.totalPrice,
      requesterName: order.requester?.name ?? null,
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

// 구매 요청 상세 조회
async function getPurchaseRequestDetail(params: {
  orderId: string;
  companyId: string;
}) {
  const { orderId, companyId } = params;

  // 승인 여부 판단에 필요한 예산 정보를 함께 내려준다
  const [order, budget] = await Promise.all([
    orderRepository.findOrderDetailById(orderId),
    budgetService.getCurrentMonthBudget(companyId),
  ]);

  if (!order) {
    throw new AppError(ErrorCodes.ORDER.NOT_FOUND);
  }

  if (order.companyId !== companyId) {
    throw new AppError(ErrorCodes.ORDER.UNAUTHORIZED_ACCESS);
  }

  if (order.type !== OrderType.REQUEST) {
    throw new AppError(ErrorCodes.ORDER.NOT_FOUND);
  }

  return {
    ...toOrderDetailResponse(order),
    budget,
  };
}

// 즉시구매 (장바구니에서 고른 항목을 바로 구매 확정)
async function createDirectOrder(params: {
  userId: string;
  companyId: string;
  cartItemIds: string[];
}) {
  const { userId, companyId, cartItemIds } = params;

  if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
    throw new AppError(ErrorCodes.ORDER.EMPTY_ITEMS);
  }

  // 같은 항목을 두 번 보내도 한 번만 구매되도록 정리한다
  const uniqueCartItemIds = [...new Set(cartItemIds)];

  // 구매 시점이 속한 달의 예산과 지출을 기준으로 검증한다
  const monthRange = getKstMonthRange(toKstYearMonth(new Date()));

  const result = await orderRepository.createDirectOrder({
    userId,
    companyId,
    cartItemIds: uniqueCartItemIds,
    monthRange,
  });

  if (result.status === "CART_ITEM_NOT_FOUND") {
    throw new AppError(ErrorCodes.CART.ITEM_NOT_FOUND);
  }

  if (result.status === "PRODUCT_NOT_FOUND") {
    throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND);
  }

  if (result.status === "BUDGET_EXCEEDED") {
    throw new AppError(ErrorCodes.BUDGET.INSUFFICIENT_MONTHLY_BUDGET);
  }

  return result.order;
}

// 구매 요청 생성 (완료 페이지용 요약 포함)
async function createPurchaseRequest(params: {
  userId: string;
  companyId: string;
  cartItemIds: string[];
  requestMessage?: string;
}) {
  const { userId, companyId, cartItemIds, requestMessage } = params;

  if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
    throw new AppError(ErrorCodes.ORDER.EMPTY_ITEMS);
  }

  const uniqueCartItemIds = [...new Set(cartItemIds)];

  const result = await orderRepository.createPurchaseRequest({
    userId,
    companyId,
    cartItemIds: uniqueCartItemIds,
    requestMessage,
  });

  if (result.status === "CART_ITEM_NOT_FOUND") {
    throw new AppError(ErrorCodes.CART.ITEM_NOT_FOUND);
  }

  if (result.status === "PRODUCT_NOT_FOUND") {
    throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND);
  }

  const { order } = result;
  const totalQuantity = order.orderItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const firstItem = order.orderItems[0];

  return {
    orderId: order.id,
    status: order.status,
    productAmount: order.productAmount,
    shippingFee: order.shippingFee,
    totalPrice: order.totalPrice,
    totalQuantity,
    requestMessage: order.requestMessage,
    requestedAt: order.createdAt,
    // 완료 페이지: 대표 상품명·카테고리 + 총 수량·총 금액
    firstProductName: firstItem?.productName ?? null,
    categoryName: firstItem?.categoryName ?? null,
  };
}

async function getProcessablePurchaseRequest(
  orderId: string,
  companyId: string,
) {
  const order = await orderRepository.findOrderById(orderId);
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

  // 승인 시점이 속한 달의 예산과 지출을 기준으로 검증한다
  const monthRange = getKstMonthRange(toKstYearMonth(new Date()));

  const result = await orderRepository.updateOrderToApproved({
    orderId: order.id,
    companyId,
    processorId: userId,
    responseMessage,
    monthRange,
  });

  // 검증 이후 다른 요청이 먼저 처리했다면 갱신 대상이 없다
  if (result.status === "ALREADY_PROCESSED") {
    throw new AppError(ErrorCodes.ORDER.INVALID_ORDER_STATUS);
  }

  if (result.status === "BUDGET_EXCEEDED") {
    throw new AppError(ErrorCodes.BUDGET.INSUFFICIENT_MONTHLY_BUDGET);
  }

  return result.order;
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
  getPurchaseRequestList,
  getPurchaseRequestDetail,
  createDirectOrder,
  createPurchaseRequest,
  approveOrder,
  rejectOrder,
};
