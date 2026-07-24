import productRepository from "../repositories/productRepository.js";
import { Prisma } from "@prisma/client";

interface CreateProductInput {
  companyId: string;
  categoryId: string;
  name: string;
  price: number;
  imageUrl?: string;
  stock?: number;
  productUrl?: string;
}

// 상품 등록
async function createProduct(input: CreateProductInput) {
  const { name, price, categoryId, companyId } = input;

  if (!name || !categoryId || !companyId) {
    throw new Error("필수 항목이 누락되었습니다.");
  }

  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("상품명이 올바르지 않습니다.");
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("가격은 0보다 큰 숫자여야 합니다.");
  }

  if (
    input.stock !== undefined &&
    (!Number.isFinite(input.stock) || input.stock < 0)
  ) {
    throw new Error("재고 수량이 올바르지 않습니다.");
  }

  return productRepository.create({
    name: name.trim(),
    price,
    imageUrl: input.imageUrl,
    stock: input.stock ?? 0,
    productUrl: input.productUrl,
    categoryId,
    companyId,
  });
}

//상품 리스트 조회
async function getProducts(
  categoryId?: string,
  page = 1,
  limit = 8,
  sort = "latest",
) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 30);

  const where: Prisma.ProductWhereInput = {};
  if (categoryId) {
    where.categoryId = categoryId;
  }

  const orderBy = getOrderBy(sort);

  const [products, total] = await Promise.all([
    productRepository.findMany(
      where,
      (safePage - 1) * safeLimit,
      safeLimit,
      orderBy,
    ),
    productRepository.count(where),
  ]);

  return {
    products,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

// 정렬
function getOrderBy(sort: string): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "priceAsc":
      return { price: "asc" };
    case "priceDesc":
      return { price: "desc" };
    case "popular":
      return { purchaseCount: "desc" };
    case "latest":
    default:
      return { createdAt: "desc" };
  }
}

export default {
  createProduct,
  getProducts,
};
