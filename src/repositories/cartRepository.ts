import { Prisma } from "@prisma/client";
import prisma from "../config/db";

export type CartItemWithProduct = Prisma.CartItemGetPayload<{
  include: {
    product: {
      select: {
        id: true;
        name: true;
        price: true;
        imageUrl: true;
        stock: true;
      };
    };
  };
}>;

// userId로 장바구니 목록 조회 (상품 정보 포함)
async function findByUserId(userId: string): Promise<CartItemWithProduct[]> {
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