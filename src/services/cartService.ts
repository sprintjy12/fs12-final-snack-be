import cartRepository from "../repositories/cartRepository";
import { CartItemWithProduct } from "../repositories/cartRepository";
import AppError from "../utils/appError";
import { ErrorCodes } from "../constants/errorCodes";
import prisma from "../config/db";

type LockedCartItem = {
  id: string;
  productId: string;
  quantity: number;
};

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
      SELECT stock FROM products WHERE id = ${productId}::uuid FOR UPDATE
    `;
    if (!product) {
      throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND);
    }

    // 2. 기존 장바구니 아이템 조회 (tx만 사용)
    const existingItem = await cartRepository.findByUserAndProduct(
      userId,
      productId,
      tx,
    );
    const targetQuantity = existingItem
      ? existingItem.quantity + quantity
      : quantity;

    // 3. 재고 확인
    if (product.stock < targetQuantity) {
      throw new AppError(ErrorCodes.PRODUCT.INSUFFICIENT_STOCK);
    }

    // 4. 추가 또는 업데이트
    if (existingItem) {
      const item = await cartRepository.updateQuantity(
        existingItem.id,
        targetQuantity,
        tx,
      );
      return { created: false, item };
    } else {
      const item = await cartRepository.create(
        userId,
        productId,
        targetQuantity,
        tx,
      );
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
  const result = await cartRepository.deleteById(cartItemId, userId);

  if (result.count === 0) {
    throw new AppError(ErrorCodes.CART.ITEM_NOT_FOUND);
  }

  return result;
}

// 장바구니 선택 삭제
async function deleteSelectedCartItems(userId: string, cartItemIds: string[]) {
  const result = await cartRepository.deleteManyByIds(cartItemIds, userId);

  if (result.count === 0) {
    throw new AppError(ErrorCodes.CART.ITEM_NOT_FOUND);
  }

  return result;
}

// 상품 수량 수정
async function updateCartItem(userId: string, cartItemId: string, delta: number) {
  return prisma.$transaction(async (tx) => {
    // 1. 락 없이 productId만 먼저 조회
    const cartItemRow = await tx.cartItem.findFirst({
      where: { id: cartItemId, userId },
      select: { productId: true },
    });
    if (!cartItemRow) {
      throw new AppError(ErrorCodes.CART.ITEM_NOT_FOUND);
    }

    // 2. products 먼저 잠금 (addToCart와 순서 통일)
    const [product] = await tx.$queryRaw<{ stock: number }[]>`
      SELECT stock FROM products WHERE id = ${cartItemRow.productId}::uuid FOR UPDATE
    `;
    if (!product) {
      throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND);
    }

    // 3. 그 다음 cart_items 잠금 — 최신 quantity 재조회
    const [lockedCartItem] = await tx.$queryRaw<LockedCartItem[]>`
      SELECT id, "productId", quantity
      FROM cart_items
      WHERE id = ${cartItemId}::uuid AND "userId" = ${userId}::uuid
      FOR UPDATE
    `;
    if (!lockedCartItem) {
      throw new AppError(ErrorCodes.CART.ITEM_NOT_FOUND);
    }

    const newQuantity = lockedCartItem.quantity + delta;

    if (newQuantity <= 0) {
      await cartRepository.deleteById(cartItemId, userId, tx);
      return { deleted: true, item: null };
    }
    if (product.stock < newQuantity) {
      throw new AppError(ErrorCodes.CART.INSUFFICIENT_STOCK);
    }

    const updated = await cartRepository.updateQuantity(cartItemId, newQuantity, tx);
    return { deleted: false, item: updated };
  });
}

export default {
  getCart,
  addToCart,
  deleteCart,
  deleteCartItem,
  deleteSelectedCartItems,
  updateCartItem,
};
