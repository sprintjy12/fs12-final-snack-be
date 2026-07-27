import OrderRepository from "../repositories/orderRepository";
import AppError from "../utils/appError";
import { ErrorCodes } from "../constants/errorCodes";

export class OrderService {
  constructor(private orderRepository: OrderRepository) {}

  async getOrderHistory(params: {
    userId: string;
    page: number;
    limit: number;
    sort?: string;
  }) {
    const { userId, page, limit, sort } = params;

    const companyId = await this.orderRepository.findCompanyIdByUserId(userId);
    if (!companyId) {
      throw new AppError(ErrorCodes.USER.NOT_FOUND);
    }

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
  async getOrderDetail(orderId: string, userId: string) {
    const companyId = await this.orderRepository.findCompanyIdByUserId(userId);
    if (!companyId) {
      throw new AppError(ErrorCodes.USER.NOT_FOUND);
    }

    const order = await this.orderRepository.findOrderById(orderId);

    if (!order) {
      throw new AppError(ErrorCodes.ORDER.NOT_FOUND);
    }

    if (order.companyId !== companyId) {
      throw new AppError(ErrorCodes.ORDER.UNAUTHORIZED_ACCESS);
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
}
