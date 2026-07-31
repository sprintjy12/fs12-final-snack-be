import { Request, Response } from "express";

import { SuperAdminSignupInput } from "../schemas/authSchema.js";
import { signupSuperAdmin } from "../services/authService.js";
import asyncHandler from "../utils/asyncHandler.js";

const signupSuperAdminController = asyncHandler(
  async (req: Request, res: Response) => {
    const signupData = req.body as SuperAdminSignupInput;

    const result = await signupSuperAdmin(signupData);

    res.status(201).json({
      message: "최고 관리자 회원가입에 성공했습니다.",
      data: result,
    });
  },
);

export default {
  signupSuperAdmin: signupSuperAdminController,
};