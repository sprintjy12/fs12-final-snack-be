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

// 해당 연월의 예산 (설정하지 않았으면 null)
async function findBudgetAmount(companyId: string, yearMonth: string) {
  const budget = await prisma.budget.findUnique({
    where: { companyId_yearMonth: { companyId, yearMonth } },
    select: { amount: true },
  });

  return budget?.amount ?? null;
}

// 기본 월 예산과 이번달 예산 저장 (값이 그대로면 쓰지 않는다)
async function updateBudgetSettings(params: {
  companyId: string;
  yearMonth: string;
  defaultMonthlyBudget?: number;
  monthlyBudget?: number | null;
}) {
  const { companyId, yearMonth, defaultMonthlyBudget, monthlyBudget } = params;

  return prisma.$transaction(async (tx) => {
    const [company, budget] = await Promise.all([
      tx.company.findUnique({
        where: { id: companyId },
        select: { defaultMonthlyBudget: true },
      }),
      tx.budget.findUnique({
        where: { companyId_yearMonth: { companyId, yearMonth } },
        select: { amount: true },
      }),
    ]);

    const previousDefault = company?.defaultMonthlyBudget ?? 0;
    // 이번달 예산은 레코드가 있는지로만 판단한다 (없으면 기본 월 예산을 따르는 상태)
    const previousAmount = budget?.amount ?? null;

    if (
      defaultMonthlyBudget !== undefined &&
      defaultMonthlyBudget !== previousDefault
    ) {
      await tx.company.update({
        where: { id: companyId },
        data: { defaultMonthlyBudget },
      });
    }

    if (monthlyBudget === null) {
      // 이번달 예산을 비우면 기본 월 예산을 따르도록 레코드를 지운다
      if (budget) {
        await tx.budget.delete({
          where: { companyId_yearMonth: { companyId, yearMonth } },
        });
      }

      return;
    }

    // 값이 그대로면 불필요하게 쓰지 않는다
    if (monthlyBudget === undefined || monthlyBudget === previousAmount) {
      return;
    }

    await tx.budget.upsert({
      where: { companyId_yearMonth: { companyId, yearMonth } },
      create: { companyId, yearMonth, amount: monthlyBudget },
      update: { amount: monthlyBudget },
    });
  });
}

export default {
  findBudgetsByYearMonths,
  findDefaultMonthlyBudget,
  findBudgetAmount,
  findBudgetAmountInTx,
  updateBudgetSettings,
};
