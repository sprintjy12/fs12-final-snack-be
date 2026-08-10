import express from "express";
import { UserRole } from "@prisma/client";
import {
  getOrderHistoryList,
  getOrderHistoryDetail,
  getPurchaseRequestList,
  getPurchaseRequestDetail,
  getMyPurchaseRequestList,
  getMyPurchaseRequestDetail,
  createDirectOrder,
  createPurchaseRequest,
  cancelPurchaseRequest,
  approveOrder,
  rejectOrder,
} from "../controllers/orderController";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/zodValidate";
import {
  createDirectOrderSchema,
  createPurchaseRequestSchema,
  processOrderSchema,
  getOrdersQuerySchema,
  orderIdParamSchema,
} from "../schemas/orderSchema";

const orderRouter = express.Router();

const adminUp = [UserRole.ADMIN, UserRole.SUPER_ADMIN] as const;
const userUp = [
  UserRole.USER,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
] as const;

// "/requests", "/my-requests"가 "/:orderId"로 잡히지 않도록 먼저 등록
orderRouter.get(
  "/requests",
  authenticate,
  authorize(...adminUp),
  validate(getOrdersQuerySchema, "query"),
  getPurchaseRequestList,
);
orderRouter.post(
  "/requests",
  authenticate,
  authorize(UserRole.USER),
  validate(createPurchaseRequestSchema, "body"),
  createPurchaseRequest,
);
orderRouter.get(
  "/requests/:orderId",
  authenticate,
  authorize(...adminUp),
  validate(orderIdParamSchema, "params"),
  getPurchaseRequestDetail,
);
orderRouter.patch(
  "/requests/:orderId/cancel",
  authenticate,
  authorize(...userUp),
  validate(orderIdParamSchema, "params"),
  cancelPurchaseRequest,
);

orderRouter.get(
  "/my-requests",
  authenticate,
  authorize(...userUp),
  validate(getOrdersQuerySchema, "query"),
  getMyPurchaseRequestList,
);
orderRouter.get(
  "/my-requests/:orderId",
  authenticate,
  authorize(...userUp),
  validate(orderIdParamSchema, "params"),
  getMyPurchaseRequestDetail,
);

orderRouter.post(
  "/direct",
  authenticate,
  authorize(...adminUp),
  validate(createDirectOrderSchema, "body"),
  createDirectOrder,
);

orderRouter.get(
  "/",
  authenticate,
  authorize(...adminUp),
  validate(getOrdersQuerySchema, "query"),
  getOrderHistoryList,
);
orderRouter.get(
  "/:orderId",
  authenticate,
  authorize(...adminUp),
  validate(orderIdParamSchema, "params"),
  getOrderHistoryDetail,
);
orderRouter.patch(
  "/:orderId/approve",
  authenticate,
  authorize(...adminUp),
  validate(orderIdParamSchema, "params"),
  validate(processOrderSchema, "body"),
  approveOrder,
);
orderRouter.patch(
  "/:orderId/reject",
  authenticate,
  authorize(...adminUp),
  validate(orderIdParamSchema, "params"),
  validate(processOrderSchema, "body"),
  rejectOrder,
);

export default orderRouter;
