import { Request, Response } from "express";
import cartService from "../services/cartService";

// 장바구니 조회
async function getCart(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error("인증이 필요합니다.");
  }

  const result = await cartService.getCart(userId);

  res.status(200).json({
    message: "장바구니 조회 성공",
    data: result,
  });
}

// 장바구니 추가
// 장바구니 수량 수정
// 장바구니 개별 삭제
// 장바구니 전체 삭제

export default {
  getCart,
};
