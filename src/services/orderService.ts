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
}
