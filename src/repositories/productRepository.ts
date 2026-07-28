import prisma from "../config/db";
import { Prisma } from "@prisma/client";

interface CreateProductData {
  name: string;
  price: number;
  categoryId: string;
  companyId: string;
  createdById: string;
  imageUrl?: string;
  stock?: number;
  productUrl?: string;
}

// 상품 등록
async function create(data: CreateProductData) {
  return prisma.product.create({
    data: {
      name: data.name,
      price: data.price,
      imageUrl: data.imageUrl,
      stock: data.stock,
      productUrl: data.productUrl,
      company: {
        connect: {
          id: data.companyId,
        },
      },
      category: {
        connect: {
          id: data.categoryId,
        },
      },
      createdBy: {
        connect: {
          id: data.createdById,
        },
      },
    },
    include: {
      category: true,
    },
  });
}

// 상품 목록 조회
async function findMany(
  where: Prisma.ProductWhereInput,
  skip: number,
  take: number,
  orderBy: Prisma.ProductOrderByWithRelationInput,
) {
  return prisma.product.findMany({
    where,
    skip,
    take,
    orderBy,
    include: { category: true },
  });
}

async function count(where: Prisma.ProductWhereInput) {
  return prisma.product.count({ where });
}

// 상품 삭제하기 위해 id 찾기
async function findById(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      orderItems: { select: { id: true }, take: 1 }, // 주문 이력 존재 여부만 확인
    },
  });
}

// 상품 삭제
async function deleteById(productId: string) {
  return prisma.product.delete({
    where: { id: productId },
  });
}

export default {
  create,
  findMany,
  count,
  findById,
  deleteById,
};
