import jwt, {
    JwtPayload,
    JsonWebTokenError,
    TokenExpiredError,
  } from "jsonwebtoken";
  
  import AppError from "./appError";
  import { ErrorCodes } from "../constants/errorCodes";
  
  type AccessTokenPayload = JwtPayload & {
    sub: string;
    companyId: string;
    role: string;
    type: "access";
  };
  
  const getAccessTokenSecret = () => {
    const secret = process.env.JWT_SECRET;
  
    if (!secret) {
      throw new Error("JWT_SECRET 환경변수가 설정되지 않았습니다.");
    }
  
    return secret;
  };
  
  export const verifyAccessToken = (
    token: string,
  ): AccessTokenPayload => {
    try {
      const decoded = jwt.verify(
        token,
        getAccessTokenSecret(),
      );
  
      if (
        typeof decoded === "string" ||
        !decoded.sub ||
        decoded.type !== "access"
      ) {
        throw new AppError(
          ErrorCodes.AUTH.INVALID_ACCESS_TOKEN,
        );
      }
  
      return decoded as AccessTokenPayload;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
  
      if (error instanceof TokenExpiredError) {
        throw new AppError(
          ErrorCodes.AUTH.ACCESS_TOKEN_EXPIRED,
        );
      }
  
      if (error instanceof JsonWebTokenError) {
        throw new AppError(
          ErrorCodes.AUTH.INVALID_ACCESS_TOKEN,
        );
      }
  
      throw error;
    }
  };