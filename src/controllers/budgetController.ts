import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import budgetService from "../services/budgetService";

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
