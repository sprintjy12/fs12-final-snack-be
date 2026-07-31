import cartRepository from "../repositories/cartRepository";
import { CartItemWithProduct } from "../repositories/cartRepository";
import AppError from "../utils/appError";
import { ErrorCodes } from "../constants/errorCodes";
import prisma from "../config/db";

//장바구니 조회
async function getCart(userId: string) {
  const cartItems: CartItemWithProduct[] =
    await cartRepository.findByUserId(userId);

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  return {
    items: cartItems,
    summary: {
      totalQuantity,
      totalPrice,
    },
  };
}

// 장바구니 추가
async function addToCart(userId: string, productId: string, quantity: number) {
  return prisma.$transaction(async (tx) => {
    // 1. 상품 조회 (FOR UPDATE 락만 추가)
    const [product] = await tx.$queryRaw<{ stock: number }[]>`
      SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
    `;
    if (!product) {
      throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND);
    }

    // 2. 기존 장바구니 아이템 조회 (tx만 사용)
    const existingItem = await cartRepository.findByUserAndProduct(userId, productId, tx);
    const targetQuantity = existingItem ? existingItem.quantity + quantity : quantity;

    // 3. 재고 확인
    if (product.stock < targetQuantity) {
      throw new AppError(ErrorCodes.PRODUCT.INSUFFICIENT_STOCK);
    }

    // 4. 추가 또는 업데이트
    if (existingItem) {
      const item = await cartRepository.updateQuantity(existingItem.id, targetQuantity, tx);
      return { created: false, item };
    } else {
      const item = await cartRepository.create(userId, productId, targetQuantity, tx);
      return { created: true, item };
    }
  });
}

// 장바구니 전체 삭제
async function deleteCart(userId: string) {
  return cartRepository.deleteAll(userId);
}

// 장바구니 개별 삭제
async function deleteCartItem(userId: string, cartItemId: string) {
  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
  });
  if (!item) {
    throw new AppError(ErrorCodes.CART.ITEM_NOT_FOUND);
  }
  if (item.userId !== userId) {
    throw new AppError(ErrorCodes.AUTH.FORBIDDEN);
  }
  return cartRepository.deleteById(cartItemId);
  }

export default {
  getCart,
  addToCart,
  deleteCart,
  deleteCartItem,
};
