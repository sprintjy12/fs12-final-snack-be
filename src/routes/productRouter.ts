import express from "express";
import productController from "../controllers/productController.js";
import asyncHandler from "../utils/asyncHandler.js";
import { validate } from "../middlewares/zodValidate.js";
import {
  getProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
} from "../schemas/productSchema.js";

const productRoutes = express.Router();

// 상품 전체 조회 -
productRoutes.get(
  "/",
  validate(getProductsQuerySchema, "query"),
  asyncHandler(productController.getProducts),
);

// 상품 등록 -
productRoutes.post(
  "/",
  validate(createProductSchema, "body"),
  asyncHandler(productController.createProduct),
);

// 내가 등록한 상품 조회 -
productRoutes.get(
  "/me",
  validate(getProductsQuerySchema, "query"),
  asyncHandler(productController.getMyProducts),
);

// 상품 상세 조회 -
productRoutes.get(
  "/:productId",
  validate(productIdParamSchema, "params"),
  asyncHandler(productController.getProductById),
);

// 상품 수정 -
productRoutes.patch(
  "/:productId",
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema, "body"),
  asyncHandler(productController.updateProduct),
);

// 상품 삭제 -
productRoutes.delete(
  "/:productId",
  validate(productIdParamSchema, "params"),
  asyncHandler(productController.deleteProduct),
);

export default productRoutes;
