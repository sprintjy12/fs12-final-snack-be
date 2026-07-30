import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.string().uuid("올바른 상품 ID가 아닙니다."),
  quantity: z.coerce
    .number()
    .int("수량은 정수여야 합니다.")
    .min(1, "최소 1개 이상 추가해야 합니다.")
    .default(1),
});
