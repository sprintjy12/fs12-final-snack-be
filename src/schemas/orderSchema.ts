import { z } from "zod";
import { MAX_DIRECT_ORDER_CART_ITEMS } from "../constants/order";

// 즉시구매 body (구매할 장바구니 항목 목록)
export const createDirectOrderSchema = z.object({
  cartItemIds: z
    .array(z.string().uuid("장바구니 항목 형식이 올바르지 않습니다."))
    .nonempty("구매할 장바구니 항목을 선택해주세요.")
    .max(
      MAX_DIRECT_ORDER_CART_ITEMS,
      `한 번에 구매할 수 있는 상품은 최대 ${MAX_DIRECT_ORDER_CART_ITEMS}개입니다.`,
    ),
});
