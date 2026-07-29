import budgetRepository from "../repositories/budgetRepository";
import orderRepository from "../repositories/orderRepository";
import {
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
  getBudgetSummary,
};
