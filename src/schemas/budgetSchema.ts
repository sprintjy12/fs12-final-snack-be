import { z } from "zod";

// Postgres INTEGER 상한을 넘으면 DB 에러가 나므로 미리 막는다
const MAX_BUDGET_AMOUNT = 2_147_483_647;

const budgetAmount = z
  .number()
  .int("예산은 정수여야 합니다.")
  .min(0, "예산은 0원 이상이어야 합니다.")
  .max(MAX_BUDGET_AMOUNT, "예산이 너무 큽니다.");

// 예산 설정 저장 body (변경한 값만 보내고, monthlyBudget이 null이면 기본 월 예산을 따른다)
export const updateBudgetSettingsSchema = z
  .object({
    defaultMonthlyBudget: budgetAmount.optional(),
    monthlyBudget: budgetAmount.nullable().optional(),
  })
  .refine(
    (data) =>
      data.defaultMonthlyBudget !== undefined ||
      data.monthlyBudget !== undefined,
    { message: "변경할 예산 값을 하나 이상 보내주세요." },
  );

// 월별 통계 조회 query
export const getMonthlyBudgetSummarySchema = z.object({
  yearMonth: z
    .string()
    .regex(
      /^[1-9]\d{3}-(0[1-9]|1[0-2])$/,
      "조회 연월은 YYYY-MM 형식이어야 합니다.",
    ),
});
