import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import budgetService from "../services/budgetService";

export const getBudgetSettings = asyncHandler(
  async (req: Request, res: Response) => {
    const { companyId } = req.user!;

    const data = await budgetService.getBudgetSettings(companyId);

    return res.status(200).json({
      success: true,
      message: "예산 설정 조회 성공",
      data,
    });
  },
);

export const updateBudgetSettings = asyncHandler(
  async (req: Request, res: Response) => {
    const { companyId } = req.user!;
    const { defaultMonthlyBudget, monthlyBudget } = req.body;

    const data = await budgetService.updateBudgetSettings({
      companyId,
      defaultMonthlyBudget,
      monthlyBudget,
    });

    return res.status(200).json({
      success: true,
      message: "예산 설정 저장 성공",
      data,
    });
  },
);

export const getBudgetSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const { companyId } = req.user!;

    const data = await budgetService.getBudgetSummary(companyId);

    return res.status(200).json({
      success: true,
      message: "예산 현황 조회 성공",
      data,
    });
  },
);
