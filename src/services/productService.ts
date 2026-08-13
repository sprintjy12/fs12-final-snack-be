import productRepository from "../repositories/productRepository.js";
import categoryService from "./categoryService.js";
import { Prisma, UserRole } from "@prisma/client";
import AppError from "../utils/appError.js";
import { ErrorCodes } from "../constants/errorCodes.js";

export interface CreateProductInput {
  companyId: string;
  categoryId: string;
  createdById: string;
  name: string;
  price: number;
  imageUrl: string;
  productUrl?: string;
}

// 상품 등록
async function createProduct(input: CreateProductInput) {
  const { name, price, categoryId, companyId, createdById } = input;

  if (!name || !categoryId || !companyId || !createdById) {
    throw new AppError(ErrorCodes.PRODUCT.MISSING_REQUIRED_FIELDS);
  }

  if (typeof name !== "string" || name.trim().length === 0) {
    throw new AppError(ErrorCodes.PRODUCT.INVALID_NAME);
  }

  if (!Number.isInteger(price) || price <= 0) {
    throw new AppError(ErrorCodes.PRODUCT.INVALID_PRICE);
  }

  if (!input.imageUrl || typeof input.imageUrl !== "string") {
    throw new AppError(ErrorCodes.PRODUCT.INVALID_IMAGE_URL);
  }

  return productRepository.create({
    name: name.trim(),
    price,
    imageUrl: input.imageUrl,
    productUrl: input.productUrl,
    categoryId,
    companyId,
    createdById,
  });
}

//상품 리스트 조회
async function getProducts(
  companyId: string,
  categoryId?: string,
  page = 1,
  limit = 8,
  sort = "latest",
) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 30);

  const where: Prisma.ProductWhereInput = { companyId };
  if (categoryId) {
    const categoryIds = await categoryService.resolveCategoryIds(categoryId);
    where.categoryId =
      categoryIds.length === 1 ? categoryIds[0] : { in: categoryIds };
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
function getOrderBy(sort: string): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "priceAsc":
      return [{ price: "asc" }, { id: "asc" }];
    case "priceDesc":
      return [{ price: "desc" }, { id: "desc" }];
    case "popular":
      return [{ purchaseCount: "desc" }, { id: "desc" }];
    case "latest":
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

// 내가 등록한 상품 조회
async function getMyProducts(
  userId: string,
  page = 1,
  limit = 8,
  sort = "latest",
) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 30);

  const orderBy = getOrderBy(sort);

  const [products, total] = await Promise.all([
    productRepository.findManyByUserId(
      userId,
      (safePage - 1) * safeLimit,
      safeLimit,
      orderBy,
    ),
    productRepository.countByUserId(userId),
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

// 상품 상세 조회
async function getProductById(productId: string, companyId: string) {
  const product = await productRepository.findByIdWithDetail(productId);

  if (!product) {
    throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND);
  }

  if (product.companyId !== companyId) {
    throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND);
  }

  return product;
}

//상품 삭제
async function deleteProduct(
  productId: string,
  userId: string,
  userRole: UserRole,
) {
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND);
  }

  if (product.createdById !== userId && userRole === "USER") {
    throw new AppError(ErrorCodes.PRODUCT.UNAUTHORIZED_ACCESS);
  }

  if (product.orderItems.length > 0) {
    throw new AppError(ErrorCodes.PRODUCT.HAS_ORDER_HISTORY);
  }

  try {
    await productRepository.deleteById(productId);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      throw new AppError(ErrorCodes.PRODUCT.HAS_ORDER_HISTORY);
    }
    throw err;
  }
}

//상품 수정
async function updateProduct(
  productId: string,
  userId: string,
  userRole: UserRole,
  input: Partial<CreateProductInput>,
) {
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new AppError(ErrorCodes.PRODUCT.NOT_FOUND);
  }

  if (product.createdById !== userId && userRole === "USER") {
    throw new AppError(ErrorCodes.PRODUCT.UNAUTHORIZED_ACCESS);
  }

  if (
    input.price !== undefined &&
    (!Number.isInteger(input.price) || input.price <= 0)
  ) {
    throw new AppError(ErrorCodes.PRODUCT.INVALID_PRICE);
  }

  // categoryId를 Prisma.ProductUpdateInput 형태로 변환합니다.
  // ProductUpdateInput은 categoryId 필드를 직접 허용하지 않으므로
  // category: { connect: { id } } 관계 연결 형식으로 매핑해야 합니다.
  const { categoryId, ...rest } = input;

  const updateData: Prisma.ProductUpdateInput = {
    ...rest,
    ...(categoryId !== undefined && {
      category: { connect: { id: categoryId } },
    }),
  };

  return productRepository.updateById(productId, updateData);
}

export default {
  createProduct,
  getProducts,
  getMyProducts,
  getProductById,
  deleteProduct,
  updateProduct,
};
