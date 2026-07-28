import prisma from "../config/db";
import { OrderStatus } from "@prisma/client";

class OrderRepository {

  async findCompanyIdByUserId(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    return user?.companyId ?? null;
  }

 //구매 내역 조회
  async findOrderHistoryList(params: {
    companyId: string;
    page: number;
    limit: number;
    sort?: string;
  }) {
    const { companyId, page, limit, sort = "latest" } = params;
    const skip = (page - 1) * limit;

    let orderBy: any = { createdAt: "desc" };
    if (sort === "highPrice") orderBy = { totalPrice: "desc" };
    if (sort === "lowPrice") orderBy = { totalPrice: "asc" };

    const whereCondition = { companyId,
        status: OrderStatus.APPROVED
     };

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

  //구매 내역 상세 조회
  async findOrderById(orderId: string) {
    return await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        requester: { 
          select: { name: true } 
        },
        processor: { 
          select: { name: true } 
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
}

export default OrderRepository;
