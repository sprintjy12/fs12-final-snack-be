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
  // 상품 존재 여부만 확인 (재고 검증 없음)
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND);
  }

  const existingItem = await cartRepository.findByUserAndProduct(
    userId,
    productId,
  );
  const targetQuantity = existingItem
    ? existingItem.quantity + quantity
    : quantity;

  if (existingItem) {
    const item = await cartRepository.updateQuantity(
      existingItem.id,
      targetQuantity,
    );
    return { created: false, item };
  } else {
    const item = await cartRepository.create(userId, productId, targetQuantity);
    return { created: true, item };
  }
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
  const cartItem = await cartRepository.findByIdAndUser(cartItemId, userId);
  if (!cartItem) {
    throw new AppError(ErrorCodes.CART.ITEM_NOT_FOUND);
  }

  const newQuantity = cartItem.quantity + delta;

  if (newQuantity <= 0) {
    await cartRepository.deleteById(cartItemId, userId);
    return { deleted: true, item: null };
  }

  const updated = await cartRepository.updateQuantity(cartItemId, newQuantity);
  return { deleted: false, item: updated };
}

export default {
  getCart,
  addToCart,
  deleteCart,
  deleteCartItem,
  deleteSelectedCartItems,
  updateCartItem,
};
