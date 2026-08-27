// 주문 아이템 카테고리 스냅샷은 "대분류>카테고리" 형태로 저장한다
export function formatCategoryName(category: {
  name: string;
  parent: { name: string } | null;
}) {
  return category.parent
    ? `${category.parent.name}>${category.name}`
    : category.name;
}
