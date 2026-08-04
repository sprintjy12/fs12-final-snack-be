import { UserRole } from "@prisma/client";

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

/**
 * 유저 권한 변경 및 리프레시 토큰 전체 삭제
 * @param userId 유저 ID
 * @param role 변경할 권한
 */
export const updateUserRoleAndInvalidateSessions = async (
  userId: string,
  role: UserRole,
) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: {
        id: userId,
      },
      data: {
        role,
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

    await tx.refreshToken.deleteMany({
      where: {
        userId,
      },
    });

    return user;
  });
};