import budgetRepository from "../repositories/budgetRepository";
import orderRepository from "../repositories/orderRepository";
import {
  formatYearMonth,
  getKstMonthRange,
  kstMonthStart,
  shiftMonth,
  toKstYearMonth,
} from "../utils/date";

// 이번달 예산/지출 현황
async function getCurrentMonthBudget(companyId: string) {
  const currentMonthRange = getKstMonthRange(toKstYearMonth(new Date()));

  const [spent, budgets, defaultMonthlyBudget] = await Promise.all([
    orderRepository.sumApprovedOrderTotal({
      companyId,
      from: currentMonthRange.from,
      to: currentMonthRange.to,
    }),
    budgetRepository.findBudgetsByYearMonths(companyId, [
      currentMonthRange.yearMonth,
    ]),
    budgetRepository.findDefaultMonthlyBudget(companyId),
  ]);

  const budget = budgets[0]?.amount ?? defaultMonthlyBudget;

  return {
    yearMonth: currentMonthRange.yearMonth,
    budget,
    spent,
    remaining: budget - spent,
  };
}

// 예산 관리 페이지용 설정값 조회
async function getBudgetSettings(companyId: string) {
  const yearMonth = formatYearMonth(toKstYearMonth(new Date()));

  const [monthlyBudget, defaultMonthlyBudget] = await Promise.all([
    budgetRepository.findBudgetAmount(companyId, yearMonth),
    budgetRepository.findDefaultMonthlyBudget(companyId),
  ]);

  return {
    defaultMonthlyBudget,
    currentMonth: {
      yearMonth,
      // 이번달만 따로 설정한 값이 없으면 null (화면에서 빈 칸으로 두고 기본 예산을 따른다)
      amount: monthlyBudget,
    },
  };
}

// 이번달 예산과 기본 월 예산 저장
async function updateBudgetSettings(params: {
  companyId: string;
  defaultMonthlyBudget?: number;
  monthlyBudget?: number | null;
}) {
  const { companyId, defaultMonthlyBudget, monthlyBudget } = params;
  const yearMonth = formatYearMonth(toKstYearMonth(new Date()));

  await budgetRepository.updateBudgetSettings({
    companyId,
    yearMonth,
    defaultMonthlyBudget,
    monthlyBudget,
  });

  return getBudgetSettings(companyId);
}

// 예산/지출 현황 조회
async function getBudgetSummary(companyId: string) {
  const currentMonth = toKstYearMonth(new Date());

  const currentMonthRange = getKstMonthRange(currentMonth);
  const previousMonthRange = getKstMonthRange(shiftMonth(currentMonth, -1));

  const currentYearStart = kstMonthStart({ year: currentMonth.year, month: 0 });
  const previousYearStart = kstMonthStart({
    year: currentMonth.year - 1,
    month: 0,
  });
  const nextYearStart = kstMonthStart({
    year: currentMonth.year + 1,
    month: 0,
  });

  const [
    currentMonthSpent,
    previousMonthSpent,
    currentYearSpent,
    previousYearSpent,
    budgets,
    defaultMonthlyBudget,
  ] = await Promise.all([
    orderRepository.sumApprovedOrderTotal({
      companyId,
      from: currentMonthRange.from,
      to: currentMonthRange.to,
    }),
    orderRepository.sumApprovedOrderTotal({
      companyId,
      from: previousMonthRange.from,
      to: previousMonthRange.to,
    }),
    orderRepository.sumApprovedOrderTotal({
      companyId,
      from: currentYearStart,
      to: nextYearStart,
    }),
    orderRepository.sumApprovedOrderTotal({
      companyId,
      from: previousYearStart,
      to: currentYearStart,
    }),
    budgetRepository.findBudgetsByYearMonths(companyId, [
      currentMonthRange.yearMonth,
      previousMonthRange.yearMonth,
    ]),
    budgetRepository.findDefaultMonthlyBudget(companyId),
  ]);

  const budgetByYearMonth = new Map(
    budgets.map((budget) => [budget.yearMonth, budget.amount]),
  );

  // 해당 월 예산이 따로 없으면 회사 기본 월 예산을 적용한다
  const currentMonthBudget =
    budgetByYearMonth.get(currentMonthRange.yearMonth) ?? defaultMonthlyBudget;
  const previousMonthBudget =
    budgetByYearMonth.get(previousMonthRange.yearMonth) ?? defaultMonthlyBudget;

  const currentMonthRemaining = currentMonthBudget - currentMonthSpent;
  const previousMonthRemaining = previousMonthBudget - previousMonthSpent;

  return {
    currentMonth: {
      yearMonth: currentMonthRange.yearMonth,
      budget: currentMonthBudget,
      spent: currentMonthSpent,
      remaining: currentMonthRemaining,
    },
    previousMonth: {
      yearMonth: previousMonthRange.yearMonth,
      budget: previousMonthBudget,
      spent: previousMonthSpent,
      remaining: previousMonthRemaining,
    },
    // 양수면 지난달보다 남은 예산이 더 많다는 뜻
    remainingDiffFromPreviousMonth:
      currentMonthRemaining - previousMonthRemaining,
    currentYear: {
      year: currentMonth.year,
      spent: currentYearSpent,
    },
    previousYear: {
      year: currentMonth.year - 1,
      spent: previousYearSpent,
    },
    // 양수면 지난해보다 더 많이 썼다는 뜻
    spentDiffFromPreviousYear: currentYearSpent - previousYearSpent,
  };
}

export default {
  getCurrentMonthBudget,
  getBudgetSettings,
  updateBudgetSettings,
  getBudgetSummary,
};
