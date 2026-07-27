import { Request, Response } from "express";
import express from "express";
import productService from "../services/productService.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/appError.js";
import { ErrorCodes } from "../constants/errorCodes.js";

const productController = express.Router();

// 상품 목록 조회
productController.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { categoryId, page = 1, limit = 8, sort = "latest" } = req.query;

    const pageNum = Number(page) || 1;
    const safePage = pageNum < 1 ? 1 : pageNum;

    const limitNum = Number(limit) || 8;
    const safeLimit = limitNum < 1 ? 8 : Math.min(limitNum, 30);

    const result = await productService.getProducts(
      categoryId as string,
      safePage,
      safeLimit,
      sort as string,
    );

    res.status(200).json({
      message: "상품 목록 조회 성공",
      data: result.products,
      pagination: result.pagination,
    });
  }),
);

// 상품 등록
productController.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, price, categoryId, imageUrl, stock, productUrl } = req.body;

    // auth 미들웨어 붙으면 req.user.id / req.user.companyId 사용
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    if (!userId || !companyId) {
      throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
    }

    const product = await productService.createProduct({
      name,
      price: Number(price),
      categoryId,
      companyId,
      createdById: userId,
      imageUrl,
      stock: stock !== undefined ? Number(stock) : undefined,
      productUrl,
    });

    res.status(201).json({
      message: "상품 등록 성공",
      data: product,
    });
  }),
);

//내가 등록한 상품 조회
productController.get("/me", (req: Request, res: Response) => {
  return res.status(200).json({ message: "내가 등록한 상품 조회 성공" });
});

// 상품 삭제
productController.delete(
  "/:productId",
  asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;

    // auth 미들웨어 붙으면 req.user.id 사용
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
    }

    await productService.deleteProduct(productId, userId);

    res.status(200).json({ message: "상품 삭제 성공" });
  }),
);

//상품 수정
productController.patch("/:productId", (req: Request, res: Response) => {
  return res.status(200).json({ message: "상품 수정 성공" });
});

//상품 상세 조회
productController.get("/:productId", (req: Request, res: Response) => {
  return res.status(200).json({ message: "상품 상세 조회 성공" });
});

export default productController;
