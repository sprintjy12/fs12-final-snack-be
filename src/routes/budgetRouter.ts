import express from "express";
import { UserRole } from "@prisma/client";
import {
  getBudgetSummary,
  getBudgetSettings,
  updateBudgetSettings,
} from "../controllers/budgetController";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/zodValidate";
import { updateBudgetSettingsSchema } from "../schemas/budgetSchema";

const budgetRouter = express.Router();

const adminUp = [UserRole.ADMIN, UserRole.SUPER_ADMIN] as const;

budgetRouter.get(
  "/summary",
  authenticate,
  authorize(...adminUp),
  getBudgetSummary,
);

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
  validate(updateBudgetSettingsSchema, "body"),
  updateBudgetSettings,
);

export default budgetRouter;
