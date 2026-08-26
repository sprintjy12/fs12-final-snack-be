import { performance } from "node:perf_hooks";
import companyRepository from "../repositories/companyRepository";
import monthlyStatisticsService from "../services/monthlyStatisticsService";
import {
  formatYearMonth,
  shiftMonth,
  toKstYearMonth,
} from "../utils/date";

type CompanyJobResult = {
  companyId: string;
  status: "CREATED" | "VALID" | "CORRECTED" | "FAILED";
  error?: string;
};

function getPreviousYearMonth(now: Date) {
  return formatYearMonth(shiftMonth(toKstYearMonth(now), -1));
}

async function runForAllCompanies(params: {
  job: "CREATE_PREVIOUS_MONTH_SNAPSHOT" | "VERIFY_PREVIOUS_MONTH_SNAPSHOT";
  yearMonth: string;
  run: (
    companyId: string,
  ) => Promise<"CREATED" | "VALID" | "CORRECTED">;
}) {
  const { job, yearMonth, run } = params;
  const startedAt = performance.now();
  const companies = await companyRepository.findAllCompanyIds();
  const results: CompanyJobResult[] = [];

  // RDS에 순간 부하가 몰리지 않도록 회사별로 순차 처리한다
  for (const company of companies) {
    try {
      const status = await run(company.id);
      results.push({ companyId: company.id, status });
    } catch (error) {
      results.push({
        companyId: company.id,
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const summary = {
    job,
    yearMonth,
    companyCount: companies.length,
    successCount: results.filter((result) => result.status !== "FAILED").length,
    failureCount: results.filter((result) => result.status === "FAILED").length,
    createdCount: results.filter((result) => result.status === "CREATED").length,
    correctedCount: results.filter((result) => result.status === "CORRECTED")
      .length,
    validCount: results.filter((result) => result.status === "VALID").length,
    durationMs: Number((performance.now() - startedAt).toFixed(2)),
    results,
  };

  console.info("[monthly-statistics-job]", summary);

  if (summary.failureCount > 0) {
    throw new Error(
      `${job} 작업에서 ${summary.failureCount}개 회사 처리가 실패했습니다.`,
    );
  }

  return summary;
}

async function generatePreviousMonthSnapshots(now = new Date()) {
  const yearMonth = getPreviousYearMonth(now);

  return runForAllCompanies({
    job: "CREATE_PREVIOUS_MONTH_SNAPSHOT",
    yearMonth,
    run: async (companyId) => {
      await monthlyStatisticsService.generateMonthlySnapshot(
        companyId,
        yearMonth,
      );
      return "CREATED";
    },
  });
}

async function verifyPreviousMonthSnapshots(now = new Date()) {
  const yearMonth = getPreviousYearMonth(now);

  return runForAllCompanies({
    job: "VERIFY_PREVIOUS_MONTH_SNAPSHOT",
    yearMonth,
    run: async (companyId) => {
      const result = await monthlyStatisticsService.verifyMonthlySnapshot(
        companyId,
        yearMonth,
      );
      return result.status;
    },
  });
}

export default {
  generatePreviousMonthSnapshots,
  verifyPreviousMonthSnapshots,
};
