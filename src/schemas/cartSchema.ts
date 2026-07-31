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
