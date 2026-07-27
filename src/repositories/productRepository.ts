import prisma from "../config/db";
import { Prisma } from "@prisma/client";

interface CreateProductData {
  name: string;
  price: number;
  categoryId: string;
  companyId: string;
  imageUrl?: string;
  stock?: number;
  productUrl?: string;
}

async function create(data: CreateProductData) {
  return prisma.product.create({
    data: {
      name: data.name,
      price: data.price,
      imageUrl: data.imageUrl,
      stock: data.stock,
      productUrl: data.productUrl,
      category: { connect: { id: data.categoryId } },
      company: { connect: { id: data.companyId } },
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

export default {
  create,
  findMany,
  count,
};
