import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import { OrderService } from "../services/orderService";
import OrderRepository from "../repositories/orderRepository";

const orderService = new OrderService(new OrderRepository());

export const getOrderHistoryList = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const sort = (req.query.sort as "latest" | "highPrice" | "lowPrice") || "latest";

  const result = await orderService.getOrderHistory({
    userId,
    page,
    limit,
    sort,
  });

  return res.status(200).json({
    success: true,
    message: "구매 내역 리스트 조회 성공",
    ...result,
  });
});

export const getOrderHistoryDetail = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const orderId = req.params.orderId as string;

  const data = await orderService.getOrderDetail(orderId, userId);

  return res.status(200).json({
    success: true,
    message: "구매 내역 상세 조회 성공",
    data,
  });
});
 