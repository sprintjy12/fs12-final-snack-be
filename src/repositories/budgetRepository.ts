import { Prisma } from "@prisma/client";
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

// 해당 월 예산이 없을 때 사용하는 회사 기본 월 예산
async function findDefaultMonthlyBudget(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { defaultMonthlyBudget: true },
  });

  return company?.defaultMonthlyBudget ?? 0;
}

// 승인 트랜잭션 안에서 쓰기 위해 트랜잭션 클라이언트를 받는다
async function findBudgetAmountInTx(
  tx: Prisma.TransactionClient,
  companyId: string,
  yearMonth: string,
) {
  const budget = await tx.budget.findUnique({
    where: { companyId_yearMonth: { companyId, yearMonth } },
    select: { amount: true },
  });

  return budget?.amount ?? null;
}

export default {
  findBudgetsByYearMonths,
  findDefaultMonthlyBudget,
  findBudgetAmountInTx,
};
