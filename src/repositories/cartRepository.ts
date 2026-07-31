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

// 유저와 상품으로 장바구니 항목 조회
async function findByUserAndProduct(userId: string, productId: string, tx?: Prisma.TransactionClient) {
  const client = tx || prisma;
  return client.cartItem.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });
}

// 장바구니 추가
async function create(userId: string, productId: string, quantity: number, tx?: Prisma.TransactionClient) {
  const client = tx || prisma;
  return client.cartItem.create({
    data: {
      userId,
      productId,
      quantity,
    },
  });
}

// 장바구니 수량 수정
async function updateQuantity(id: string, quantity: number, tx?: Prisma.TransactionClient) {
  const client = tx || prisma;
  return client.cartItem.update({
    where: { id },
    data: { quantity },
  });
}

// 유저의 장바구니 전체 삭제
async function deleteAll(userId: string) {
  return prisma.cartItem.deleteMany({
    where: { userId },
  });
}

export default {
  findByUserId,
  findByUserAndProduct,
  create,
  updateQuantity,
  deleteAll,
};