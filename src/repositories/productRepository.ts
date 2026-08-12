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
  orderBy:
    | Prisma.ProductOrderByWithRelationInput
    | Prisma.ProductOrderByWithRelationInput[],
) {
  return prisma.product.findMany({
    where,
    skip,
    take,
    orderBy,
    include: {
      category: {
        include: { parent: true },
      },
    },
  });
}

async function count(where: Prisma.ProductWhereInput) {
  return prisma.product.count({ where });
}

// 내가 등록한 상품 목록 조회
async function findManyByUserId(
  userId: string,
  skip: number,
  take: number,
  orderBy:
    | Prisma.ProductOrderByWithRelationInput
    | Prisma.ProductOrderByWithRelationInput[],
) {
  return prisma.product.findMany({
    where: { createdById: userId },
    skip,
    take,
    orderBy,
    include: { category: true },
  });
}

async function countByUserId(userId: string) {
  return prisma.product.count({ where: { createdById: userId } });
}

// 상품 id 조회
async function findById(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      orderItems: { select: { id: true }, take: 1 }, // 주문 이력 존재 여부만 확인
    },
  });
}

// 상품 상세 조회
async function findByIdWithDetail(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: {
        include: { parent: true },
      },
      company: true,
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });
}

// 상품 삭제
async function deleteById(productId: string) {
  return prisma.product.delete({
    where: { id: productId },
  });
}

// 상품 수정
async function updateById(productId: string, data: Prisma.ProductUpdateInput) {
  return prisma.product.update({
    where: { id: productId },
    data,
    include: { category: true },
  });
}

export default {
  create,
  findMany,
  count,
  findManyByUserId,
  countByUserId,
  findById,
  findByIdWithDetail,
  deleteById,
  updateById,
};
