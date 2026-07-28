import express from "express";
import productController from "../controllers/productController.js";
import asyncHandler from "../utils/asyncHandler.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const productRoutes = express.Router();

// 상품 전체 조회 -
productRoutes.get("/", asyncHandler(productController.getProducts));

// 상품 등록 -
productRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(productController.createProduct),
);

// 내가 등록한 상품 조회
productRoutes.get(
  "/me",
  authMiddleware,
  asyncHandler(productController.getMyProducts),
);

// 상품 상세 조회
productRoutes.get(
  "/:productId",
  asyncHandler(productController.getProductById),
);

// 상품 수정
productRoutes.patch(
  "/:productId",
  asyncHandler(productController.updateProduct),
);

// 상품 삭제 -
productRoutes.delete(
  "/:productId",
  authMiddleware,
  asyncHandler(productController.deleteProduct),
);

export default productRoutes;
