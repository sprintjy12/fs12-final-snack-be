import cartRepository from "../repositories/cartRepository";

//장바구니 조회
async function getCart(userId: string) {
  const cartItems = await cartRepository.findByUserId(userId);

  const totalQuantity = cartItems.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  const totalPrice = cartItems.reduce(
    (sum: number, item: any) => sum + item.product.price * item.quantity,
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
