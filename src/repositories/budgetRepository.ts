import prisma from "../config/db";

// 여러 연월의 예산 조회 (yearMonth는 "2026-07" 형식)
async function findBudgetsByYearMonths(
  companyId: string,
  yearMonths: string[],
) {
  return prisma.budget.findMany({
    where: { companyId, yearMonth: { in: yearMonths } },
    select: { yearMonth: true, amount: true },
  });
}

export default {
  findBudgetsByYearMonths,
};
