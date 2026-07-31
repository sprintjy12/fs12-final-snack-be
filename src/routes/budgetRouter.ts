import express from "express";
import {
  getBudgetSummary,
  getBudgetSettings,
  updateBudgetSettings,
} from "../controllers/budgetController";

const budgetRouter = express.Router();

budgetRouter.get("/summary", getBudgetSummary);

// TODO: 인가 미들웨어 연결 시 최고관리자 전용으로 제한
budgetRouter.get("/settings", getBudgetSettings);
// TODO: 검증 미들웨어 연결
// validate(updateBudgetSettingsSchema, "body")
budgetRouter.patch("/settings", updateBudgetSettings);

export default budgetRouter;
