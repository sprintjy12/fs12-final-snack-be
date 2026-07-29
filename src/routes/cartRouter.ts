import express from "express";

const cartController = express.Router();

// 장바구니 조회
cartController.get("/", (req, res) => {
  return res.status(200).json({ message: "장바구니 조회 성공" });
});

// 장바구니 추가
cartController.post("/", (req, res) => {
  return res.status(200).json({ message: "장바구니 추가 성공" });
});

// 장바구니 수량 수정
cartController.patch("/:cartId", (req, res) => {
  return res.status(200).json({ message: "장바구니 수량 수정 성공" });
});

// 장바구니  개별 삭제
cartController.delete("/:cartId", (req, res) => {
  return res.status(200).json({ message: "장바구니 삭제 성공" });
});

// 장바구니 전체 삭제
cartController.delete("/", (req, res) => {
  return res.status(200).json({ message: "장바구니 전체 삭제 성공" });
});

export default cartController;
