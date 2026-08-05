import { UserRole, UserStatus } from "@prisma/client";

import prisma from "../config/db";

/**
 * 내 정보 조회
 * @param userId 유저 ID
 * @returns 유저 및 회사 정보
 */
export const findMyProfile = async (userId: string) => {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      email: true,
      role: true,
      status: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

/**
 * 권한 변경 대상 유저 조회
 * @param userId 유저 ID
 */
export const findUserForRoleUpdate = async (userId: string) => {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });
};

type UpdateUserRoleAndInvalidateSessionsParams = {
  userId: string;
  companyId: string;
  role: UserRole;
};

/**
 * 조건부 권한 변경 + 세션 무효화
 * 같은 회사 / ACTIVE / SUPER_ADMIN 아닌 경우에만 변경한다.
 * 조건 불일치 시 토큰을 삭제하지 않고 null을 반환한다.
 */
export const updateUserRoleAndInvalidateSessions = async ({
  userId,
  companyId,
  role,
}: UpdateUserRoleAndInvalidateSessionsParams) => {
  return prisma.$transaction(async (tx) => {
    const updateResult = await tx.user.updateMany({
      where: {
        id: userId,
        companyId,
        status: UserStatus.ACTIVE,
        role: {
          not: UserRole.SUPER_ADMIN,
        },
      },
      data: {
        role,
      },
    });

    if (updateResult.count === 0) {
      return null;
    }

    await tx.refreshToken.deleteMany({
      where: {
        userId,
      },
    });

    return tx.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
  });
};

/**
 * 2026년 8월 5일 
 * 유저 비밀번호 변경 추가
 * 한희나 작업
 */
export const findUserPasswordById = async (userId: string) => {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });
};

export const updatePasswordAndDeleteRefreshTokens = async (
  userId: string,
  currentPasswordHash: string,
  newPasswordHash: string,
) => {
  return prisma.$transaction(async (transaction) => {
    const updateResult = await transaction.user.updateMany({
      where: {
        id: userId,
        passwordHash: currentPasswordHash,
      },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    if (updateResult.count !== 1) {
      return false;
    }

    await transaction.refreshToken.deleteMany({
      where: {
        userId,
      },
    });

    return true;
  });
};