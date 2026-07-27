import prisma from "../config/db";

class OrderRepository {
  async findCompanyIdByUserId(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    return user?.companyId ?? null;
  }

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

    const whereCondition = { companyId };

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
}

export default OrderRepository;
