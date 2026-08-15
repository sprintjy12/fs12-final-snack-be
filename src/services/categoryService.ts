import categoryRepository from "../repositories/categoryRepository.js";


async function resolveCategoryIds(categoryId: string): Promise<string[]> {
  const category = await categoryRepository.findByIdBasic(categoryId);

  if (!category) {
    return [categoryId];
  }

  if (category.parentId === null) {
    const children = await categoryRepository.findChildIds(categoryId);
    const leafIds = children.map((c) => c.id);
    return leafIds.length > 0 ? leafIds : [categoryId];
  }

  return [categoryId];
}

export default { resolveCategoryIds };
