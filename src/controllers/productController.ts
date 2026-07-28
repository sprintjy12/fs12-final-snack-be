import { Request, Response } from "express";
import productService from "../services/productService";
import AppError from "../utils/appError";
import { ErrorCodes } from "../constants/errorCodes";

// 상품 목록 조회
async function getProducts(req: Request, res: Response) {
  const { categoryId, page = 1, limit = 8, sort = "latest" } = req.query;

  const result = await productService.getProducts(
    categoryId as string,
    page as number,
    limit as number,
    sort as string,
  );

  res.status(200).json({
    message: "상품 목록 조회 성공",
    data: result.products,
    pagination: result.pagination,
  });
}

// 상품 등록
async function createProduct(req: Request, res: Response) {
  const { name, price, categoryId, imageUrl, stock, productUrl } = req.body;

  // auth 미들웨어 붙으면 req.user.id / req.user.companyId 사용
  const userId = req.user?.id;
  const companyId = req.user?.companyId;

  if (!userId || !companyId) {
    throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
  }

  const product = await productService.createProduct({
    name,
    price,
    categoryId,
    companyId,
    createdById: userId,
    imageUrl,
    stock,
    productUrl,
  });

  res.status(201).json({
    message: "상품 등록 성공",
    data: product,
  });
}

// 내가 등록한 상품 조회
async function getMyProducts(req: Request, res: Response) {
  return res.status(200).json({ message: "내가 등록한 상품 조회 성공" });
}

// 상품 삭제
async function deleteProduct(req: Request, res: Response) {
  const productId = req.params.productId as string;

  // auth 미들웨어 붙으면 req.user.id 사용
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
  }

  await productService.deleteProduct(productId, userId);

  res.status(200).json({ message: "상품 삭제 성공" });
}

// 상품 수정
async function updateProduct(req: Request, res: Response) {
  return res.status(200).json({ message: "상품 수정 성공" });
}

// 상품 상세 조회
async function getProductById(req: Request, res: Response) {
  return res.status(200).json({ message: "상품 상세 조회 성공" });
}

export default {
  getProducts,
  createProduct,
  getMyProducts,
  deleteProduct,
  updateProduct,
  getProductById,
};
