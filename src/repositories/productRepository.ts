import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export const productRepository = {
  create: async (data: Prisma.ProductCreateInput) => {
    return prisma.product.create({
      data,
      include: {
        category: true,
        subCategory: true,
      },
    });
  },
};
