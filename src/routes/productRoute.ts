import express from "express";
import productController from "../controllers/productController";
import asyncHandler from "../utils/asyncHandler";
import { authenticate } from "../middlewares/authenticate";
import { z } from "zod";
import { validate } from "../middlewares/zodValidate";

const productRoutes = express.Router();

// ── 스키마 ──

// 상품 목록 조회 쿼리
const getProductsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(8),
  sort: z
    .enum(["latest", "priceAsc", "priceDesc", "popular"])
    .default("latest"),
});

// 상품 등록 body
const createProductSchema = z.object({
  name: z.string().trim().min(1, "상품명을 입력해주세요."),
  price: z.coerce.number().int().positive("가격은 0보다 큰 정수여야 합니다."),
  categoryId: z.string().uuid("카테고리 ID가 올바르지 않습니다."),
  imageUrl: z.string().url("이미지 URL이 올바르지 않습니다."),
  stock: z.coerce
    .number()
    .int()
    .min(0, "재고는 0개 이상이어야 합니다.")
    .optional(),
  productUrl: z.string().url("상품 페이지 URL이 올바르지 않습니다.").optional(),
});

// 상품 수정 body (등록 스키마 재사용, 전부 optional)
const updateProductSchema = createProductSchema.partial();

// :productId 파라미터
const productIdParamSchema = z.object({
  productId: z.string().uuid("올바른 상품 ID가 아닙니다."),
});

// ── 라우트 ──

// 상품 전체 조회
productRoutes.get(
  "/",
  validate(getProductsQuerySchema, "query"),
  asyncHandler(productController.getProducts),
);

// 상품 등록
productRoutes.post(
  "/",
  authenticate,
  validate(createProductSchema, "body"),
  asyncHandler(productController.createProduct),
);

// 내가 등록한 상품 조회
productRoutes.get(
  "/me",
  authenticate,
  asyncHandler(productController.getMyProducts),
);

// 상품 상세 조회
productRoutes.get(
  "/:productId",
  validate(productIdParamSchema, "params"),
  asyncHandler(productController.getProductById),
);

// 상품 수정
productRoutes.patch(
  "/:productId",
  authenticate,
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema, "body"),
  asyncHandler(productController.updateProduct),
);

// 상품 삭제
productRoutes.delete(
  "/:productId",
  authenticate,
  validate(productIdParamSchema, "params"),
  asyncHandler(productController.deleteProduct),
);

export default productRoutes;
