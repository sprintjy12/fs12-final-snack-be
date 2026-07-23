import express from "express";

const productController = express.Router();

productController.get("/", (req, res) => {
  return res.status(200).json({ message: "상품 목록 조회 성공" });
});

productController.post("/", (req, res) => {
  return res.status(200).json({ message: "상품 등록 성공" });
});

productController.get("/me", (req, res) => {
  return res.status(200).json({ message: "내가 등록한 상품 조회 성공" });
});

productController.delete("/:productId", (req, res) => {
  return res.status(200).json({ message: "상품 삭제 성공" });
});

productController.patch("/:productId", (req, res) => {
  return res.status(200).json({ message: "상품 수정 성공" });
});

productController.get("/:productId", (req, res) => {
  return res.status(200).json({ message: "상품 상세 조회 성공" });
});

export default productController;
