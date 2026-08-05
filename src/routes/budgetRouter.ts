import express from "express";
import { UserRole } from "@prisma/client";
import {
  getBudgetSummary,
  getBudgetSettings,
  updateBudgetSettings,
} from "../controllers/budgetController";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";

const budgetRouter = express.Router();

const adminUp = [UserRole.ADMIN, UserRole.SUPER_ADMIN] as const;

budgetRouter.get(
  "/summary",
  authenticate,
  authorize(...adminUp),
  getBudgetSummary,
);

// TODO: 검증 미들웨어 연결
// validate(updateBudgetSettingsSchema, "body")
budgetRouter.get(
  "/settings",
  authenticate,
  authorize(...adminUp),
  getBudgetSettings,
);

budgetRouter.patch(
  "/settings",
  authenticate,
  authorize(...adminUp),
  updateBudgetSettings,
);

export default budgetRouter;
