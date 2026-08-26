import monthlyStatisticsRepository, {
  MonthlySpending,
} from "../repositories/monthlyStatisticsRepository";
import orderRepository from "../repositories/orderRepository";
import {
  formatYearMonth,
  getKstMonthRange,
  toKstYearMonth,
} from "../utils/date";

function parseYearMonth(yearMonth: string) {
  const match = /^([1-9]\d{3})-(0[1-9]|1[0-2])$/.exec(yearMonth);

  if (!match) {
    throw new Error(`올바르지 않은 연월입니다: ${yearMonth}`);
  }

  return { year: Number(match[1]), month: Number(match[2]) - 1 };
}

async function aggregateMonthlySpending(
  companyId: string,
  yearMonth: string,
) {
  const monthRange = getKstMonthRange(parseYearMonth(yearMonth));

  return orderRepository.aggregateApprovedMonthlySpending({
    companyId,
    from: monthRange.from,
    to: monthRange.to,
  });
}

async function generateMonthlySnapshot(
  companyId: string,
  yearMonth: string,
) {
  const spending = await aggregateMonthlySpending(companyId, yearMonth);

  await monthlyStatisticsRepository.upsertMonthlySpendingSnapshot({
    companyId,
    yearMonth,
    spending,
  });

  return spending;
}

async function getMonthlySpending(companyId: string, yearMonth: string) {
  const currentYearMonth = formatYearMonth(toKstYearMonth(new Date()));

  // 이번 달과 미래 월은 변경될 수 있으므로 원본 주문을 조회한다
  if (yearMonth >= currentYearMonth) {
    return aggregateMonthlySpending(companyId, yearMonth);
  }

  const snapshot =
    await monthlyStatisticsRepository.findMonthlySpendingSnapshot(
      companyId,
      yearMonth,
    );

  if (snapshot) {
    return snapshot;
  }

  // 월마감 배치가 누락된 경우 API 요청에서 스냅샷을 복구한다
  return generateMonthlySnapshot(companyId, yearMonth);
}

function isSameSpending(
  snapshot: MonthlySpending,
  original: MonthlySpending,
) {
  if (
    snapshot.spent !== original.spent ||
    snapshot.productAmount !== original.productAmount ||
    snapshot.shippingFee !== original.shippingFee ||
    snapshot.categories.length !== original.categories.length
  ) {
    return false;
  }

  const snapshotAmountByCategory = new Map(
    snapshot.categories.map((category) => [category.name, category.amount]),
  );

  return original.categories.every(
    (category) =>
      snapshotAmountByCategory.get(category.name) === category.amount,
  );
}

async function verifyMonthlySnapshot(
  companyId: string,
  yearMonth: string,
) {
  const [snapshot, original] = await Promise.all([
    monthlyStatisticsRepository.findMonthlySpendingSnapshot(
      companyId,
      yearMonth,
    ),
    aggregateMonthlySpending(companyId, yearMonth),
  ]);

  if (snapshot && isSameSpending(snapshot, original)) {
    return { status: "VALID" as const, spending: snapshot };
  }

  await monthlyStatisticsRepository.upsertMonthlySpendingSnapshot({
    companyId,
    yearMonth,
    spending: original,
  });

  return {
    status: snapshot ? ("CORRECTED" as const) : ("CREATED" as const),
    spending: original,
  };
}

export default {
  generateMonthlySnapshot,
  getMonthlySpending,
  verifyMonthlySnapshot,
};
