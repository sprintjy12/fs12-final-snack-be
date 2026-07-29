import express from "express";
import {
  getOrderHistoryList,
  getOrderHistoryDetail,
  getPurchaseRequestList,
  getPurchaseRequestDetail,
  approveOrder,
  rejectOrder,
} from "../controllers/orderController";

const orderRouter = express.Router();

// "/requests"가 "/:orderId"로 잡히지 않도록 먼저 등록
orderRouter.get("/requests", getPurchaseRequestList);
orderRouter.get("/requests/:orderId", getPurchaseRequestDetail);

orderRouter.get("/", getOrderHistoryList);
orderRouter.get("/:orderId", getOrderHistoryDetail);
orderRouter.patch("/:orderId/approve", approveOrder);
orderRouter.patch("/:orderId/reject", rejectOrder);

export default orderRouter;
