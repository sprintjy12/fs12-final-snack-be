export const SHIPPING_FEE = 3000;

// 상품 금액이 이 금액 이상이면 배송비 무료
export const FREE_SHIPPING_THRESHOLD = 50_000;

// 즉시구매·구매 요청 한 번에 담을 수 있는 장바구니 항목 수 상한
export const MAX_ORDER_CART_ITEMS = 50;

export function calculateShippingFee(productAmount: number) {
  return productAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}
