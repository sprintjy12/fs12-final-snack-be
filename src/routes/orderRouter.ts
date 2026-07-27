import express from "express";
import { getOrderHistoryList, getOrderHistoryDetail } from "../controllers/orderController";

const orderRouter = express.Router();

orderRouter.get("/", getOrderHistoryList);
orderRouter.get("/:orderId", getOrderHistoryDetail);

export default orderRouter;
