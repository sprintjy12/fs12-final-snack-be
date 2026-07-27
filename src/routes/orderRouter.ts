import express from "express";
import { getOrderHistoryList } from "../controllers/orderController";

const orderRouter = express.Router();

orderRouter.get("/", getOrderHistoryList);

export default orderRouter;
