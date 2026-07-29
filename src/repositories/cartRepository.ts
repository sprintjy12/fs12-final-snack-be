import prisma from "../config/db";

// userId로 장바구니 목록 조회
async function findByUserId(userId: string) {
  return prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
          stock: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default {
  findByUserId,
};
