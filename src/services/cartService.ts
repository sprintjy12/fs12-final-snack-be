import cartRepository from "../repositories/cartRepository";
import { CartItemWithProduct } from "../repositories/cartRepository";
import productRepository from "../repositories/productRepository";
import AppError from "../utils/appError";
import { ErrorCodes } from "../constants/errorCodes";

//장바구니 조회
async function getCart(userId: string) {
  const cartItems: CartItemWithProduct[] = await cartRepository.findByUserId(userId);

  const totalQuantity = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

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
  // 1. 상품 존재 확인
  const product = await productRepository.findById(productId);
  if (!product) {
    throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND);
  }

  // 2. 기존 장바구니 아이템 조회
  const existingItem = await cartRepository.findByUserAndProduct(userId, productId);
  const targetQuantity = existingItem ? existingItem.quantity + quantity : quantity;

  // 3. 재고 확인
  if (product.stock < targetQuantity) {
    throw new AppError(ErrorCodes.PRODUCT.INSUFFICIENT_STOCK);
  }

  // 4. 추가 또는 업데이트
  if (existingItem) {
    return cartRepository.updateQuantity(existingItem.id, targetQuantity);
  } else {
    return cartRepository.create(userId, productId, targetQuantity);
  }
}

export default {
  getCart,
  addToCart,
};
