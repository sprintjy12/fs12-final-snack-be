import express from "express";
import cartController from "../controllers/cartController.js";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/zodValidate.js";
import { addToCartSchema } from "../schemas/cartSchema.js";
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
cartRouter.patch("/:cartId", (req, res) => {
  return res.status(200).json({ message: "장바구니 수량 수정 성공" });
});

// 장바구니  개별 삭제
cartRouter.delete("/:cartId", (req, res) => {
  return res.status(200).json({ message: "장바구니 삭제 성공" });
});

// 장바구니 전체 삭제
cartRouter.delete("/", authenticate, asyncHandler(cartController.deleteCart));

export default cartRouter;
