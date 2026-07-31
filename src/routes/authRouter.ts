import { Router } from "express";

import authController from "../controllers/authController.js";
import { validate } from "../middlewares/zodValidate.js";
import { superAdminSignupSchema } from "../schemas/authSchema.js";

/**
 * 인증 라우터
 * @returns 인증 라우터
 */
const authRouter = Router();

/**
 * 최고 관리자 회원가입
 * @param req 요청
 * @param res 응답
 * @returns 최고 관리자 회원가입 성공 메시지
 */
authRouter.post(
  "/super-admin/signup",
  validate(superAdminSignupSchema),
  authController.handleSignupSuperAdmin,
);

export default authRouter;