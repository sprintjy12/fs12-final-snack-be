import { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

import {
  getMyProfile,
  updateUserRole,
} from "../services/userService";
import { UpdateUserRoleInput } from "../schemas/userSchema";
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

/**
 * 회원 권한 변경
 */
const handleUpdateUserRole = asyncHandler(
  async (
    req: Request<
      ParamsDictionary,
      unknown,
      UpdateUserRoleInput
    >,
    res: Response,
  ) => {
    const actor = req.user!;
    const userId = req.params.userId as string;
    const { role } = req.body;

    const user = await updateUserRole({
      actorCompanyId: actor.companyId,
      targetUserId: userId,
      role,
    });

    res.status(200).json({
      message: "회원 권한 변경에 성공했습니다.",
      data: user,
    });
  },
);

export default {
  getMyProfile: handleGetMyProfile,
  updateUserRole: handleUpdateUserRole,
};
