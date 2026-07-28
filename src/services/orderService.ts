import OrderRepository from "../repositories/orderRepository";
import AppError from "../utils/appError";
import { ErrorCodes } from "../constants/errorCodes";
import { OrderStatus, OrderType } from "@prisma/client";

export class OrderService {
  constructor(private orderRepository: OrderRepository) {}

  async getOrderHistory(params: {
    companyId: string;
    page: number;
    limit: number;
    sort?: string;
  }) {
    const { companyId, page, limit, sort } = params;

    const { totalCount, orders } = await this.orderRepository.findOrderHistoryList({
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
          firstProductName: itemCount > 0 ? order.orderItems[0].productName : null,
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

  // 구매 상세 내역 조회 서비스 메서드
  async getOrderDetail(params: { orderId: string; companyId: string }) {
    const { orderId, companyId } = params;
    const order = await this.orderRepository.findOrderById(orderId);

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

  // 구매 승인
  async approveOrder(params: {
    orderId: string;
    userId: string;
    companyId: string;
    responseMessage?: string;
  }) {
    const { orderId, userId, companyId, responseMessage } = params;
    const order = await this.getProcessablePurchaseRequest(orderId, companyId);

    return this.orderRepository.updateOrderToApproved({
      orderId: order.id,
      processorId: userId,
      responseMessage,
    });
  }

  // 구매 반려
  async rejectOrder(params: {
    orderId: string;
    userId: string;
    companyId: string;
    responseMessage?: string;
  }) {
    const { orderId, userId, companyId, responseMessage } = params;
    const order = await this.getProcessablePurchaseRequest(orderId, companyId);

    return this.orderRepository.updateOrderToRejected({
      orderId: order.id,
      processorId: userId,
      responseMessage,
    });
  }

  private async getProcessablePurchaseRequest(orderId: string, companyId: string) {
    const order = await this.orderRepository.findOrderByOrderId(orderId);
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
}
