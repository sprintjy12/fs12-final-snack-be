import { UserRole, UserStatus } from "@prisma/client";

import { ErrorCodes } from "../constants/errorCodes";
import {
  findMyProfile,
  findUserForRoleUpdate,
  updateUserRoleAndInvalidateSessions,
} from "../repositories/userRepository";
import { UpdateUserRoleInput } from "../schemas/userSchema";
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

type UpdateUserRoleParams = {
  actorCompanyId: string;
  targetUserId: string;
  role: UpdateUserRoleInput["role"];
};

/**
 * 회원 권한 변경
 * @param actorCompanyId 요청자 회사 ID
 * @param targetUserId 대상 유저 ID
 * @param role 변경할 권한 (USER | ADMIN)
 */
export const updateUserRole = async ({
  actorCompanyId,
  targetUserId,
  role,
}: UpdateUserRoleParams) => {
  const targetUser = await findUserForRoleUpdate(targetUserId);

  if (!targetUser) {
    throw new AppError(ErrorCodes.USER.NOT_FOUND);
  }

  if (targetUser.companyId !== actorCompanyId) {
    throw new AppError(ErrorCodes.USER.UNAUTHORIZED_ACCESS);
  }

  if (targetUser.role === UserRole.SUPER_ADMIN) {
    throw new AppError(ErrorCodes.USER.CANNOT_CHANGE_SUPER_ADMIN);
  }

  if (targetUser.status !== UserStatus.ACTIVE) {
    throw new AppError(ErrorCodes.AUTH.INACTIVE_USER);
  }

  return updateUserRoleAndInvalidateSessions(
    targetUserId,
    role,
  );
};