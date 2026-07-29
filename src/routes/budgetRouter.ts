import express from "express";
import { getBudgetSummary } from "../controllers/budgetController";

const budgetRouter = express.Router();

budgetRouter.get("/summary", getBudgetSummary);

export default budgetRouter;
