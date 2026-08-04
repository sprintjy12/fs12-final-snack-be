import { UserStatus } from "@prisma/client";
import { ErrorCodes } from "../constants/errorCodes";
import { findMyProfile } from "../repositories/userRepository";
import AppError from "../utils/appError";

/**
 * 내 정보 조회
 * @param userId 유저 ID
 * @returns 내 정보
 */
export const getMyProfile = async (userId: string) => {
    const user = await findMyProfile(userId);
  
    if (!user) {
      throw new AppError(ErrorCodes.USER.NOT_FOUND);
    }
  
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(ErrorCodes.AUTH.INACTIVE_USER);
    }
  
    return user;
  };