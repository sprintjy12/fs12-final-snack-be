import { Request, Response } from "express";
import AppError from "../utils/appError";
import { ErrorCodes } from "../constants/errorCodes";
import cartService from "../services/cartService";

// 장바구니 조회
async function getCart(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
  }

  const result = await cartService.getCart(userId);

  res.status(200).json({
    message: "장바구니 조회 성공",
    data: result,
  });
}

// 장바구니 추가
async function addToCart(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
  }

  const { productId, quantity } = req.body;

  const result = await cartService.addToCart(userId, productId, quantity);

  res.status(result.created ? 201 : 200).json({
    message: result.created ? "장바구니 추가 성공" : "장바구니 수량 수정 성공",
    data: result.item,
  });
}

// 장바구니 수량 수정
// 장바구니 개별 삭제
async function deleteCartItem(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
  }

  const { cartItemId } = req.params as { cartItemId: string };

  const result = await cartService.deleteCartItem(userId, cartItemId);

  res.status(200).json({
    message: "장바구니 개별 삭제 성공",
    data: result,
  });
}

// 장바구니 전체 삭제
async function deleteCart(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(ErrorCodes.AUTH.UNAUTHORIZED);
  }

  const result = await cartService.deleteCart(userId);

  res.status(200).json({
    message: "장바구니 전체 삭제 성공",
    data: result,
  });
}

export default {
  getCart,
  addToCart,
  deleteCart,
  deleteCartItem
};
  