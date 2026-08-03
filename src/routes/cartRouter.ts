import express from "express";
import cartController from "../controllers/cartController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/zodValidate.js";
import {
  addToCartSchema,
  cartIdParamSchema,
  updateCartItemSchema,
  deleteSelectedCartSchema,
} from "../schemas/cartSchema.js";
import asyncHandler from "../utils/asyncHandler.js";

const cartRouter = express.Router();

// 장바구니 조회
cartRouter.get("/", authenticate, asyncHandler(cartController.getCart));

// 장바구니 추가
cartRouter.post(
  "/",
  authenticate,
  validate(addToCartSchema, "body"),
  asyncHandler(cartController.addToCart),
);

// 장바구니 수량 수정
cartRouter.patch(
  "/:cartId",
  authenticate,
  validate(cartIdParamSchema, "params"),
  validate(updateCartItemSchema, "body"),
  asyncHandler(cartController.updateCartItem),
);

// 장바구니 선택 삭제
cartRouter.delete(
  "/selected",
  authenticate,
  validate(deleteSelectedCartSchema, "body"),
  asyncHandler(cartController.deleteSelectedCartItems),
);

// 장바구니  개별 삭제
cartRouter.delete(
  "/:cartId",
  authenticate,
  validate(cartIdParamSchema, "params"),
  asyncHandler(cartController.deleteCartItem),
);

// 장바구니 전체 삭제
cartRouter.delete("/", authenticate, asyncHandler(cartController.deleteCart));

export default cartRouter;
