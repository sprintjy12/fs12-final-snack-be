import monthlyStatisticsJob from "../jobs/monthlyStatisticsJob";

type MonthlyStatisticsEvent = {
  job:
    | "CREATE_PREVIOUS_MONTH_SNAPSHOT"
    | "VERIFY_PREVIOUS_MONTH_SNAPSHOT";
};

export async function handler(event: MonthlyStatisticsEvent) {
  switch (event.job) {
    case "CREATE_PREVIOUS_MONTH_SNAPSHOT":
      return monthlyStatisticsJob.generatePreviousMonthSnapshots();
    case "VERIFY_PREVIOUS_MONTH_SNAPSHOT":
      return monthlyStatisticsJob.verifyPreviousMonthSnapshots();
    default:
      throw new Error("지원하지 않는 월별 통계 작업입니다.");
  }
}
