import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import orderService from "../services/orderService";

export const getOrderHistoryList = asyncHandler(
  async (req: Request, res: Response) => {
    const { companyId } = req.user!;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const sort =
      (req.query.sort as "latest" | "highPrice" | "lowPrice") || "latest";

    const result = await orderService.getOrderHistory({
      companyId,
      page,
      limit,
      sort,
    });

    return res.status(200).json({
      success: true,
      message: "구매 내역 리스트 조회 성공",
      ...result,
    });
  },
);

export const getOrderHistoryDetail = asyncHandler(
  async (req: Request, res: Response) => {
    const { companyId } = req.user!;
    const orderId = req.params.orderId as string;

    const data = await orderService.getOrderDetail({ orderId, companyId });

    return res.status(200).json({
      success: true,
      message: "구매 내역 상세 조회 성공",
      data,
    });
  },
);

export const approveOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId, companyId } = req.user!;
  const orderId = req.params.orderId as string;
  const { responseMessage } = req.body;

  const data = await orderService.approveOrder({
    orderId,
    userId,
    companyId,
    responseMessage,
  });

  return res.status(200).json({
    success: true,
    message: "구매 요청 승인 성공",
    data,
  });
});

export const rejectOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId, companyId } = req.user!;
  const orderId = req.params.orderId as string;
  const { responseMessage } = req.body;

  const data = await orderService.rejectOrder({
    orderId,
    userId,
    companyId,
    responseMessage,
  });

  return res.status(200).json({
    success: true,
    message: "구매 요청 반려 성공",
    data,
  });
});
