import { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

import {
  LoginInput,
  SuperAdminSignupInput,
} from "../schemas/authSchema";
import {
  login,
  refreshTokens,
  signupSuperAdmin,
  logout,
} from "../services/authService";
import asyncHandler from "../utils/asyncHandler";
import { ErrorCodes } from "../constants/errorCodes";
import AppError from "../utils/appError";

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

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

/**
 * 로그인
 * @param req 요청
 * @param res 응답
 * @returns 로그인 성공 메시지
 */
const handleLogin = asyncHandler(
  async (
    req: Request<
      ParamsDictionary,
      unknown,
      LoginInput
    >,
    res: Response,
  ) => {
    const loginData = req.body;

    const {
      accessToken,
      refreshToken,
      user,
    } = await login(loginData);

    res.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      refreshToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: REFRESH_TOKEN_MAX_AGE,
        path: "/api/auth",
      },
    );

    res.status(200).json({
      message: "로그인에 성공했습니다.",
      data: {
        accessToken,
        user,
      },
    });
  },
);

/**
 * 토큰 재발급
 */
const handleRefreshTokens = asyncHandler(
  async (
    req: Request,
    res: Response,
  ) => {
    const refreshToken =
      req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new AppError(
        ErrorCodes.AUTH.REFRESH_TOKEN_REQUIRED,
      );
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
    } = await refreshTokens(refreshToken);

    res.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      newRefreshToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: REFRESH_TOKEN_MAX_AGE,
        path: "/api/auth",
      },
    );

    res.status(200).json({
      message: "토큰 재발급에 성공했습니다.",
      data: {
        accessToken,
      },
    });
  },
);

/**
 * 로그아웃
 */
const handleLogout = asyncHandler(
  async (
    req: Request,
    res: Response,
  ) => {
    const refreshToken =
      req.cookies?.refreshToken;

    await logout(refreshToken);

    res.clearCookie(
      REFRESH_TOKEN_COOKIE_NAME,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/auth",
      },
    );

    res.status(200).json({
      message: "로그아웃에 성공했습니다.",
    });
  },
);

export default {
  signupSuperAdmin: handleSignupSuperAdmin,
  login: handleLogin,
  refreshTokens: handleRefreshTokens,
  logout: handleLogout,
};