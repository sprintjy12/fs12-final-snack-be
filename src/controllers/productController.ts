import { Request, Response } from "express";
import productService, {
  CreateProductInput,
} from "../services/productService.js";
import AppError from "../utils/appError.js";
import { ErrorCodes } from "../constants/errorCodes.js";

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

  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
  }

  const companyId = req.user!.companyId;

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
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
  }

  const { page, limit, sort } = req.query as unknown as {
    page: number;
    limit: number;
    sort: string;
  };

  const result = await productService.getMyProducts(userId, page, limit, sort);

  res.status(200).json({
    message: "내가 등록한 상품 조회 성공",
    data: result.products,
    pagination: result.pagination,
  });
}

// 상품 삭제
async function deleteProduct(req: Request, res: Response) {
  const { productId } = req.params;

  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId || !userRole) {
    throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
  }

  await productService.deleteProduct(productId as string, userId, userRole);

  res.status(200).json({ message: "상품 삭제 성공" });
}

// 상품 수정
async function updateProduct(req: Request, res: Response) {
  const { productId } = req.params as { productId: string };
  const input = req.body as Partial<CreateProductInput>;

  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId || !userRole) {
    throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
  }

  const product = await productService.updateProduct(productId, userId, userRole, input);

  res.status(200).json({
    message: "상품 수정 성공",
    data: product,
  });
}

// 상품 상세 조회
async function getProductById(req: Request, res: Response) {
  const { productId } = req.params as { productId: string };

  const product = await productService.getProductById(productId);

  res.status(200).json({
    message: "상품 상세 조회 성공",
    data: product,
  });
}

export default {
  getProducts,
  createProduct,
  getMyProducts,
  deleteProduct,
  updateProduct,
  getProductById,
};
