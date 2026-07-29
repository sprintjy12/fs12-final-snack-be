import express from "express";
import cartController from "../controllers/cartController";

const cartRouter = express.Router();

// 장바구니 조회
cartRouter.get("/", cartController.getCart);

// 장바구니 추가
cartRouter.post("/", (req, res) => {
  return res.status(200).json({ message: "장바구니 추가 성공" });
});

// 장바구니 수량 수정
cartRouter.patch("/:cartId", (req, res) => {
  return res.status(200).json({ message: "장바구니 수량 수정 성공" });
});

// 장바구니  개별 삭제
cartRouter.delete("/:cartId", (req, res) => {
  return res.status(200).json({ message: "장바구니 삭제 성공" });
});

// 장바구니 전체 삭제
cartRouter.delete("/", (req, res) => {
  return res.status(200).json({ message: "장바구니 전체 삭제 성공" });
});

export default cartRouter;
