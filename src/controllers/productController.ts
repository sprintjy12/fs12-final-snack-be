import express from "express";
import productService from "../services/productService.js";

const productController = express.Router();

// 상품 목록 조회
productController.get("/", async (req, res) => {
  try {
    const { categoryId, page = 1, limit = 8, sort = "latest" } = req.query;

    const pageNum = Number(page) || 1;
    const safePage = pageNum < 1 ? 1 : pageNum;

    const limitNum = Number(limit) || 8;
    const safeLimit = limitNum < 1 ? 8 : Math.min(limitNum, 30);

    const result = await productService.getProducts(
      categoryId as string,
      safePage,
      safeLimit,
      sort as string,
    );

    res.status(200).json({
      message: "상품 목록 조회 성공",
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "서버 오류" });
  }
});
// 상품 등록
productController.post("/", async (req, res) => {
  try {
    const { name, price, categoryId, imageUrl, stock, productUrl } = req.body;

    // auth 미들웨어 붙으면 req.user.companyId 사용
    const companyId = req.user?.companyId;

    if (!companyId) {
      res.status(401).json({ message: "인증이 필요합니다." });
      return;
    }

    const product = await productService.createProduct({
      name,
      price: Number(price),
      categoryId,
      companyId,
      imageUrl,
      stock: stock !== undefined ? Number(stock) : undefined,
      productUrl,
    });

    res.status(201).json({
      message: "상품 등록 성공",
      data: product,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "서버 오류" });
  }
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
