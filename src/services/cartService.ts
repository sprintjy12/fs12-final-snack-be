import cartRepository from "../repositories/cartRepository";
import { CartItemWithProduct } from "../repositories/cartRepository";

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

export default {
  getCart,
};
