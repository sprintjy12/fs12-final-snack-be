import budgetRepository from "../repositories/budgetRepository";
import orderRepository from "../repositories/orderRepository";
import {
  formatYearMonth,
  kstMonthStart,
  shiftMonth,
  toKstYearMonth,
} from "../utils/date";

// 예산/지출 현황 조회
async function getBudgetSummary(companyId: string) {
  const currentMonth = toKstYearMonth(new Date());
  const previousMonth = shiftMonth(currentMonth, -1);
  const nextMonth = shiftMonth(currentMonth, 1);

  const currentYearStart = kstMonthStart({ year: currentMonth.year, month: 0 });
  const previousYearStart = kstMonthStart({
    year: currentMonth.year - 1,
    month: 0,
  });
  const nextYearStart = kstMonthStart({ year: currentMonth.year + 1, month: 0 });

  const currentYearMonth = formatYearMonth(currentMonth);
  const previousYearMonth = formatYearMonth(previousMonth);

  const [
    currentMonthSpent,
    previousMonthSpent,
    currentYearSpent,
    previousYearSpent,
    budgets,
  ] = await Promise.all([
    orderRepository.sumApprovedOrderTotal({
      companyId,
      from: kstMonthStart(currentMonth),
      to: kstMonthStart(nextMonth),
    }),
    orderRepository.sumApprovedOrderTotal({
      companyId,
      from: kstMonthStart(previousMonth),
      to: kstMonthStart(currentMonth),
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
      currentYearMonth,
      previousYearMonth,
    ]),
  ]);

  const budgetByYearMonth = new Map(
    budgets.map((budget) => [budget.yearMonth, budget.amount]),
  );

  // 예산이 설정되지 않은 달은 0으로 보고, 지출이 있으면 남은 예산이 음수가 된다
  const currentMonthBudget = budgetByYearMonth.get(currentYearMonth) ?? 0;
  const previousMonthBudget = budgetByYearMonth.get(previousYearMonth) ?? 0;

  const currentMonthRemaining = currentMonthBudget - currentMonthSpent;
  const previousMonthRemaining = previousMonthBudget - previousMonthSpent;

  return {
    currentMonth: {
      yearMonth: currentYearMonth,
      budget: currentMonthBudget,
      spent: currentMonthSpent,
      remaining: currentMonthRemaining,
    },
    previousMonth: {
      yearMonth: previousYearMonth,
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
  getBudgetSummary,
};
