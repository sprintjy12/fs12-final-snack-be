import { UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { ErrorCodes } from "../constants/errorCodes";
import {
  findMyProfile,
  findUserForRoleUpdate,
  findUserPasswordById,
  findUsersByCompany,
  countUsersByCompany,
  updateUserRole as updateUserRoleInRepository,
  updatePasswordAndDeleteRefreshTokens,
  updateCompanyName,
  withdrawUser as withdrawUserInRepository,
} from "../repositories/userRepository";
import {
  UpdateUserRoleInput,
  ChangePasswordInput,
  ChangeCompanyNameInput,
  GetUsersQuery,
} from "../schemas/userSchema";
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
 * 조건부 update로 회사/상태/SUPER_ADMIN 제약을 원자적으로 보장한다.
 * 세션은 유지하고, 이후 요청/access 재발급부터 DB의 새 role이 적용된다.
 */
export const updateUserRole = async ({
  actorCompanyId,
  targetUserId,
  role,
}: UpdateUserRoleParams) => {
  const updatedUser = await updateUserRoleInRepository({
    userId: targetUserId,
    companyId: actorCompanyId,
    role,
  });

  if (updatedUser) {
    return updatedUser;
  }

  // 조건부 변경 실패 → 현재 상태로 실패 사유 매핑
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

  throw new AppError(ErrorCodes.AUTH.FORBIDDEN);
};


/**
 * 2026년 8월 5일 추가
 * 유저 비밀번호 변경
 * 한희나 작업
 */

export const changePassword = async (
  userId: string,
  input: ChangePasswordInput,
) => {
  const user = await findUserPasswordById(userId);

  if (!user) {
    throw new AppError(ErrorCodes.USER.NOT_FOUND);
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash,
  );

  if (!isCurrentPasswordValid) {
    throw new AppError(ErrorCodes.USER.CURRENT_PASSWORD_MISMATCH);
  }

  const isSamePassword = await bcrypt.compare(
    input.newPassword,
    user.passwordHash,
  );

  if (isSamePassword) {
    throw new AppError(ErrorCodes.USER.SAME_AS_CURRENT_PASSWORD);
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword, 12);

  const updated = await updatePasswordAndDeleteRefreshTokens(
    userId,
    user.passwordHash,
    newPasswordHash,
  );
  
  if (!updated) {
    throw new AppError(
      ErrorCodes.USER.PASSWORD_CHANGE_CONFLICT,
    );
  }
};

export const changeCompanyName = async (
  companyId: string,
  input: ChangeCompanyNameInput,
) => {
  return updateCompanyName(
    companyId, 
    input.companyName
  );
};

type GetUsersParams = {
  companyId: string;
  page: GetUsersQuery["page"];
  limit: GetUsersQuery["limit"];
  name?: GetUsersQuery["name"];
};

/**
 * 같은 회사 회원 목록 조회
 */
export const getUsers = async ({
  companyId,
  page,
  limit,
  name,
}: GetUsersParams) => {
  const searchName = name?.trim() || undefined;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    findUsersByCompany({
      companyId,
      name: searchName,
      skip,
      take: limit,
    }),
    countUsersByCompany({
      companyId,
      name: searchName,
    }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
type WithdrawUserParams = {
  actorCompanyId: string;
  targetUserId: string;
};

/**
 * 회원 강제 탈퇴
 * 조건부 update로 회사/상태/SUPER_ADMIN 제약을 원자적으로 보장한다.
 */
export const withdrawUser = async ({
  actorCompanyId,
  targetUserId,
}: WithdrawUserParams) => {
  const withdrawn = await withdrawUserInRepository({
    userId: targetUserId,
    companyId: actorCompanyId,
  });

  if (withdrawn) {
    return;
  }

  const targetUser = await findUserForRoleUpdate(targetUserId);

  if (!targetUser) {
    throw new AppError(ErrorCodes.USER.NOT_FOUND);
  }

  if (targetUser.companyId !== actorCompanyId) {
    throw new AppError(ErrorCodes.USER.UNAUTHORIZED_ACCESS);
  }

  if (targetUser.role === UserRole.SUPER_ADMIN) {
    throw new AppError(ErrorCodes.USER.CANNOT_WITHDRAW_SUPER_ADMIN);
  }

  if (targetUser.status === UserStatus.WITHDRAWN) {
    throw new AppError(ErrorCodes.USER.ALREADY_WITHDRAWN);
  }

  throw new AppError(ErrorCodes.AUTH.FORBIDDEN);
};
