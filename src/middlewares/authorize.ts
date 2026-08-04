import {
    NextFunction,
    Request,
    Response,
  } from "express";
  import { UserRole } from "@prisma/client";
  
  import AppError from "../utils/appError";
  import { ErrorCodes } from "../constants/errorCodes";
  
  /**
   * 권한 검증 미들웨어
   * @param allowedRoles - 허용된 역할 배열
   * @returns 권한 검증 미들웨어
   */
  export const authorize = (...allowedRoles: UserRole[]) => {
    // 권한 검증 미들웨어 반환
    return (
      // 요청 객체
      req: Request,
      // 응답 객체
      res: Response,
      // 다음 미들웨어 함수
      next: NextFunction,
    ) => {
      // 권한 검증 미들웨어 실행
      try {
        // 사용자 인증
        if (!req.user) {
          // 사용자 인증 실패 시 에러 발생
          throw new AppError(
            ErrorCodes.AUTH.UNAUTHORIZED,
          );
        }
        // 권한 검증
        if (!allowedRoles.includes(req.user.role)) {  
          // 권한 검증 실패 시 에러 발생
          throw new AppError(
            ErrorCodes.AUTH.FORBIDDEN,
          );
        }
        // 다음 미들웨어 실행 후 처리
        next();
      } catch (error) {
        // 에러 처리 후 다음 미들웨어 실행
        next(error);
      }
    };
  };