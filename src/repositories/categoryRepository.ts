import prisma from "../config/db";

// 카테고리 단건 조회 (id, parentId만) — 상위/하위 판단용
async function findByIdBasic(categoryId: string) {
  return prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, parentId: true },
  });
}

// 특정 부모 카테고리의 하위(leaf) 카테고리 id 목록 조회
async function findChildIds(parentId: string) {
  return prisma.category.findMany({
    where: { parentId },
    select: { id: true },
  });
}

export default {
  findByIdBasic,
  findChildIds,
};