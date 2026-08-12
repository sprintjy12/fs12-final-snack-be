import express from "express";
import categoryController from "../controllers/categoryController";
import asyncHandler from "../utils/asyncHandler";

const categoryRouter = express.Router();

categoryRouter.get("/", asyncHandler(categoryController.getCategories));

export default categoryRouter;
