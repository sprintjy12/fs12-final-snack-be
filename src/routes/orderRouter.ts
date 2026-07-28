import express from "express";
import {
  getOrderHistoryList,
  getOrderHistoryDetail,
  approveOrder,
  rejectOrder,
} from "../controllers/orderController";

const orderRouter = express.Router();

orderRouter.get("/", getOrderHistoryList);
orderRouter.get("/:orderId", getOrderHistoryDetail);
orderRouter.patch("/:orderId/approve", approveOrder);
orderRouter.patch("/:orderId/reject", rejectOrder);

export default orderRouter;
