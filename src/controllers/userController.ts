import { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

import {
  getMyProfile,
  updateUserRole,
  changePassword,
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

/**
 * 2026년 8월 5일 
 * 유저 비밀번호 변경 추가
 * 한희나 작업
 */
const handleChangePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await changePassword(userId, req.body);

    res.status(200).json({
      message: "비밀번호가 변경되었습니다. 다시 로그인해주세요.",
    });
  },
);

export default {
  getMyProfile: handleGetMyProfile,
  updateUserRole: handleUpdateUserRole,
  changePassword: handleChangePassword,
};
