import { Request, Response } from "express";
import prisma from "../config/db";

/** 대분류 + 소분류 트리 조회 (상품 리스트 GNB용) */
async function getCategories(_req: Request, res: Response) {
  const parents = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    include: {
      children: {
        orderBy: { name: "asc" },
      },
    },
  });

  res.status(200).json({
    message: "카테고리 목록 조회 성공",
    data: parents.map((parent) => ({
      id: parent.id,
      name: parent.name,
      parentId: null,
      children: parent.children.map((child) => ({
        id: child.id,
        name: child.name,
        parentId: child.parentId,
      })),
    })),
  });
}

export default {
  getCategories,
};
