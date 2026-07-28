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

  // auth 미들웨어는 userId만 넣고, companyId는 DB에서 조회
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "인증이 필요합니다." });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  if (!user) {
    res.status(404).json({ message: "존재하지 않는 유저입니다." });
    return;
  }
  const { companyId } = user;

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

  // auth 미들웨어 붙으면 req.user.id 사용
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
  }

  await productService.deleteProduct(productId as string, userId);

  res.status(200).json({ message: "상품 삭제 성공" });
}

// 상품 수정
async function updateProduct(req: Request, res: Response) {
  const { productId } = req.params as { productId: string };
  const input = req.body as Partial<CreateProductInput>;

  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
  }

  const product = await productService.updateProduct(productId, userId, input);

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
