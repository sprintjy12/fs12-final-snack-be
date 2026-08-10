import { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

import {
  getMyProfile,
  getUsers,
  updateUserRole,
  changePassword,
  changeCompanyName,
} from "../services/userService";
import { GetUsersQuery, UpdateUserRoleInput } from "../schemas/userSchema";
import asyncHandler from "../utils/asyncHandler";

/**
 * 회원 목록 조회
 */
const handleGetUsers = asyncHandler(
  async (req: Request, res: Response) => {
    const actor = req.user!;
    const { page, limit, name } = req.query as unknown as GetUsersQuery;

    const result = await getUsers({
      companyId: actor.companyId,
      page,
      limit,
      name,
    });

    res.status(200).json({
      message: "회원 목록 조회에 성공했습니다.",
      data: result.users,
      pagination: result.pagination,
    });
  },
);

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
 * 유저 비밀번호 변경 추가
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

/**
 * 회사명 변경 추가
 */
const handleChangeCompanyName = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.user!.companyId;

    const company = await changeCompanyName(companyId, req.body);

    res.status(200).json({
      message: "회사명이 변경되었습니다.",
      data: company,
    });
  },
);

export default {
  getUsers: handleGetUsers,
  getMyProfile: handleGetMyProfile,
  updateUserRole: handleUpdateUserRole,
  changePassword: handleChangePassword,
  changeCompanyName: handleChangeCompanyName,
};
