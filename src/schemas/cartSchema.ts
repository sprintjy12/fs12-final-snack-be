import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.string().uuid("올바른 상품 ID가 아닙니다."),
  quantity: z
    .preprocess((val) => {
      if (typeof val === "string" || typeof val === "number") {
        return Number(val);
      }
      return val;
    }, z.number())
    .refine((v) => Number.isInteger(v), "수량은 정수여야 합니다.")
    .refine((v) => v >= 1, "최소 1개 이상 추가해야 합니다.")
    .optional()
    .default(1),
});

export const cartIdParamSchema = z.object({
  cartId: z.string().uuid("올바른 장바구니 ID가 아닙니다."),
});

export const updateCartItemSchema = z.object({
  delta: z
    .preprocess((val) => {
      if (typeof val === "string" || typeof val === "number") {
        return Number(val);
      }
      return val;
    }, z.number())
    .refine((v) => Number.isInteger(v), "증감값은 정수여야 합니다.")
    .refine((v) => v === 1 || v === -1, "증감값은 +1 또는 -1이어야 합니다."),
});

export const deleteSelectedCartSchema = z.object({
  cartItemIds: z
    .array(z.string().uuid("올바른 장바구니 항목 ID가 아닙니다."))
    .min(1, "삭제할 항목을 최소 1개 이상 선택해야 합니다."),
});