import {
    NextFunction,
    Request,
    Response,
  } from "express";
  import { UserRole } from "@prisma/client";
  
  import AppError from "../utils/appError";
  import { ErrorCodes } from "../constants/errorCodes";
  
  export const authorize = (...allowedRoles: UserRole[]) => {
    return (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        if (!req.user) {
          throw new AppError(
            ErrorCodes.AUTH.UNAUTHORIZED,
          );
        }
  
        if (!allowedRoles.includes(req.user.role)) {
          throw new AppError(
            ErrorCodes.AUTH.FORBIDDEN,
          );
        }
  
        next();
      } catch (error) {
        next(error);
      }
    };
  };