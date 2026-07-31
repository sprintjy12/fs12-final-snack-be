import { z } from "zod";

// 즉시구매 body (구매할 장바구니 항목 목록)
export const createDirectOrderSchema = z.object({
  cartItemIds: z
    .array(z.string().uuid("장바구니 항목 형식이 올바르지 않습니다."))
    .nonempty("구매할 장바구니 항목을 선택해주세요."),
});
