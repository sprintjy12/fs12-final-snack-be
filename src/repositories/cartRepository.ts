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
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// 유저와 상품으로 장바구니 항목 조회
async function findByUserAndProduct(
  userId: string,
  productId: string,
  tx?: Prisma.TransactionClient,
) {
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

// 장바구니 수량 수정
async function updateQuantity(
  id: string,
  quantity: number,
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  return client.cartItem.update({
    where: { id },
    data: { quantity },
  });
}

// 장바구니 추가/수량 증가
async function upsertQuantity(
  userId: string,
  productId: string,
  quantity: number,
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  return client.cartItem.upsert({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    create: { userId, productId, quantity },
    update: { quantity: { increment: quantity } },
  });
}

// 유저의 장바구니 전체 삭제
async function deleteAll(userId: string) {
  return prisma.cartItem.deleteMany({
    where: { userId },
  });
}

// 유저의 장바구니 개별 삭제
async function deleteById(
  cartItemId: string,
  userId: string,
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  return client.cartItem.deleteMany({
    where: {
      id: cartItemId,
      userId,
    },
  });
}

// 유저의 장바구니 선택 삭제
async function deleteManyByIds(cartItemIds: string[], userId: string) {
  return prisma.cartItem.deleteMany({
    where: {
      id: { in: cartItemIds },
      userId,
    },
  });
}

// 사용자의 장바구니 항목 조회
async function findByIdAndUser(
  id: string,
  userId: string,
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  return client.cartItem.findFirst({
    where: { id, userId },
  });
}

export default {
  findByUserId,
  findByUserAndProduct,
  updateQuantity,
  deleteAll,
  deleteById,
  deleteManyByIds,
  findByIdAndUser,
  upsertQuantity,
};
