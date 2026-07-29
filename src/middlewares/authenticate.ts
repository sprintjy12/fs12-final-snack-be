import {
    NextFunction,
    Request,
    Response,
  } from "express";
  import { UserStatus } from "@prisma/client";
  
  import AppError from "../utils/appError";
  import { ErrorCodes } from "../constants/errorCodes";
  import { verifyAccessToken } from "../utils/token";
  import { findUserForAuthentication } from "../repositories/authRepository";
  
  const extractBearerToken = (
    authorizationHeader?: string,
  ) => {
    if (!authorizationHeader) {
      throw new AppError(
        ErrorCodes.AUTH.ACCESS_TOKEN_REQUIRED,
      );
    }
  
    const [scheme, token] = authorizationHeader.split(" ");
  
    if (
      scheme !== "Bearer" ||
      !token ||
      authorizationHeader.split(" ").length !== 2
    ) {
      throw new AppError(
        ErrorCodes.AUTH.INVALID_ACCESS_TOKEN,
      );
    }
  
    return token;
  };
  
  export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const accessToken = extractBearerToken(
        req.headers.authorization,
      );
  
      const payload = verifyAccessToken(accessToken);
  
      const user = await findUserForAuthentication(
        payload.sub,
      );
  
      if (!user) {
        throw new AppError(
          ErrorCodes.AUTH.UNAUTHORIZED,
        );
      }
  
      if (user.status !== UserStatus.ACTIVE) {
        throw new AppError(
          ErrorCodes.AUTH.INACTIVE_USER,
        );
      }
  
      req.user = {
        id: user.id,
        companyId: user.companyId,
        role: user.role,
      };
  
      next();
    } catch (error) {
      next(error);
    }
  };