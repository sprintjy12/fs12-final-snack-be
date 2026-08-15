import { z } from "zod";
// ── 스키마 ──

// 상품 목록 조회 쿼리
export const getProductsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(8),
  sort: z
    .enum(["latest", "priceAsc", "priceDesc", "popular"])
    .default("latest"),
});

// 상품 등록 body
export const createProductSchema = z.object({
  name: z.string().trim().min(1, "상품명을 입력해주세요."),
  price: z
    .union([z.string(), z.number()])
    .pipe(z.coerce.number())
    .pipe(
      z
        .number()
        .int("가격은 정수여야 합니다.")
        .positive("가격은 0보다 큰 정수여야 합니다.")
        .max(1_000_000, "가격은 최대 1,000,000원까지 등록 가능합니다."),
    ),
  categoryId: z.string().uuid("카테고리 ID가 올바르지 않습니다."),
  imageUrl: z.string().url("이미지 URL이 올바르지 않습니다."),
  productUrl: z.string().url("상품 페이지 URL이 올바르지 않습니다.").optional(),
});

// 상품 수정 body (등록 스키마 재사용, 전부 optional)
export const updateProductSchema = createProductSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "수정할 필드를 최소 1개 이상 입력해주세요.",
  });

// :productId 파라미터
export const productIdParamSchema = z.object({
  productId: z.string().uuid("올바른 상품 ID가 아닙니다."),
});
