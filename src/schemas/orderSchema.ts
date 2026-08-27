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
    .max(500, "요청 메시지는 500자 이하여야 합니다.")
    .optional(),
});

// 승인/반려 body
export const processOrderSchema = z.object({
  responseMessage: z
    .string()
    .trim()
    .min(10, "처리 메시지는 10자 이상이어야 합니다.")
    .max(500, "처리 메시지는 500자 이하여야 합니다."),
});

// 목록 조회 쿼리
export const getOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(["latest", "highPrice", "lowPrice"]).default("latest"),
});

// :orderId 파라미터
export const orderIdParamSchema = z.object({
  orderId: z.string().uuid("주문 ID 형식이 올바르지 않습니다."),
});
