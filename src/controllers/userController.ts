import { Request, Response } from "express";

import { getMyProfile } from "../services/userService";
import asyncHandler from "../utils/asyncHandler";

/**
 * 내 정보 조회
 */
const handleGetMyProfile = asyncHandler(
  async (
    req: Request,
    res: Response,
  ) => {
    const userId = req.user!.id;

    const user = await getMyProfile(userId);

    res.status(200).json({
      message: "내 정보 조회에 성공했습니다.",
      data: user,
    });
  },
);

export default {
  getMyProfile: handleGetMyProfile,
};