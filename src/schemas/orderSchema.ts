import { z } from "zod";
import { MAX_ORDER_CART_ITEMS } from "../constants/order";

const cartItemIdsSchema = z
  .array(z.string().uuid("장바구니 항목 형식이 올바르지 않습니다."))
  .nonempty("구매할 장바구니 항목을 선택해주세요.")
  .max(
    MAX_ORDER_CART_ITEMS,
    `한 번에 선택할 수 있는 상품은 최대 ${MAX_ORDER_CART_ITEMS}개입니다.`,
  );

// 즉시구매 body
export const createDirectOrderSchema = z.object({
  cartItemIds: cartItemIdsSchema,
});

// 구매 요청 생성 body
export const createPurchaseRequestSchema = z.object({
  cartItemIds: cartItemIdsSchema,
  requestMessage: z
    .string()
    .trim()
    .max(1000, "요청 메시지는 1000자 이하여야 합니다.")
    .optional(),
});
