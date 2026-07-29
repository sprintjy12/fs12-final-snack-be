// 예산/지출 집계는 한국 달력 기준이지만 DB 시각은 UTC로 저장되므로 오프셋을 직접 보정한다
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type YearMonth = { year: number; month: number }; // month는 0부터 시작

// UTC 시각을 한국 시간의 연/월로 환산
export function toKstYearMonth(date: Date): YearMonth {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return { year: kst.getUTCFullYear(), month: kst.getUTCMonth() };
}

// 연말/연초를 넘어가도 정상 동작하도록 Date 연산으로 월을 이동
export function shiftMonth({ year, month }: YearMonth, diff: number): YearMonth {
  const shifted = new Date(Date.UTC(year, month + diff, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
}

// 한국 시간 기준 해당 월 1일 00:00을 UTC 시각으로 반환
export function kstMonthStart({ year, month }: YearMonth): Date {
  return new Date(Date.UTC(year, month, 1) - KST_OFFSET_MS);
}

// Budget.yearMonth 형식("2026-07")으로 변환
export function formatYearMonth({ year, month }: YearMonth): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}
