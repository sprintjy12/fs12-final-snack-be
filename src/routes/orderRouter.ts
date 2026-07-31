import express from "express";
import {
  getOrderHistoryList,
  getOrderHistoryDetail,
  getPurchaseRequestList,
  getPurchaseRequestDetail,
  createDirectOrder,
  approveOrder,
  rejectOrder,
} from "../controllers/orderController";
import { validate } from "../middlewares/zodValidate";
import { createDirectOrderSchema } from "../schemas/orderSchema";

const orderRouter = express.Router();

// "/requests"가 "/:orderId"로 잡히지 않도록 먼저 등록
orderRouter.get("/requests", getPurchaseRequestList);
orderRouter.get("/requests/:orderId", getPurchaseRequestDetail);

// TODO: 인가 미들웨어 연결 시 관리자 이상으로 제한
orderRouter.post(
  "/direct",
  validate(createDirectOrderSchema, "body"),
  createDirectOrder,
);

orderRouter.get("/", getOrderHistoryList);
orderRouter.get("/:orderId", getOrderHistoryDetail);
orderRouter.patch("/:orderId/approve", approveOrder);
orderRouter.patch("/:orderId/reject", rejectOrder);

export default orderRouter;
