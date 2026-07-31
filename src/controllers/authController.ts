import { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

import { SuperAdminSignupInput } from "../schemas/authSchema.js";
import { signupSuperAdmin } from "../services/authService.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * 최고 관리자 회원가입
 * @param req 요청
 * @param res 응답
 * @returns 최고 관리자 회원가입 성공 메시지
 */
const handleSignupSuperAdmin = asyncHandler(
    async (
      req: Request<
        ParamsDictionary,
        unknown,
        SuperAdminSignupInput
      >,
      res: Response,
    ) => {
      const signupData = req.body;
  
      const result = await signupSuperAdmin(signupData); // 최고 관리자 회원가입
  
      res.status(201).json({
        message: "최고 관리자 회원가입에 성공했습니다.",
        data: result, 
      });
    },
  );

export default {
  handleSignupSuperAdmin,
};