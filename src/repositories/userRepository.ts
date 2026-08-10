import { OrderStatus, UserRole, UserStatus } from "@prisma/client";

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

type UpdateUserRoleParams = {
  userId: string;
  companyId: string;
  role: UserRole;
};

/**
 * 조건부 권한 변경
 * 같은 회사 / ACTIVE / SUPER_ADMIN 아닌 경우에만 변경한다.
 * refresh 세션은 유지한다. authenticate가 매 요청 DB role을 읽고,
 * access 재발급 시에도 DB role로 새 토큰이 발급된다.
 */
export const updateUserRole = async ({
  userId,
  companyId,
  role,
}: UpdateUserRoleParams) => {
  const updateResult = await prisma.user.updateMany({
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

export const updateCompanyName = async (
  companyId: string,
  companyName: string,
) => {
  return prisma.company.update({
    where: {
      id: companyId,
    },
    data: {
      name: companyName,
    },
    select: {
      id: true,
      name: true,
    },
  });
};

type FindUsersByCompanyParams = {
  companyId: string;
  name?: string;
  skip: number;
  take: number;
};

const buildCompanyUsersWhere = ({
  companyId,
  name,
}: Pick<FindUsersByCompanyParams, "companyId" | "name">) => ({
  companyId,
  status: UserStatus.ACTIVE,
  ...(name
    ? {
        name: {
          contains: name,
          mode: "insensitive" as const,
        },
      }
    : {}),
});

/**
 * 같은 회사 회원 목록 조회 (이름 부분 검색 지원)
 */
export const findUsersByCompany = async ({
  companyId,
  name,
  skip,
  take,
}: FindUsersByCompanyParams) => {
  return prisma.user.findMany({
    where: buildCompanyUsersWhere({ companyId, name }),
    skip,
    take,
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
};

/**
 * 같은 회사 회원 수 조회 (이름 부분 검색 지원)
 */
export const countUsersByCompany = async ({
  companyId,
  name,
}: Pick<FindUsersByCompanyParams, "companyId" | "name">) => {
  return prisma.user.count({
    where: buildCompanyUsersWhere({ companyId, name }),
  });
};

type WithdrawUserParams = {
  userId: string;
  companyId: string;
};

/**
 * 회원 강제 탈퇴 (soft delete)
 * 같은 회사 / ACTIVE / SUPER_ADMIN 아닌 경우에만 탈퇴 처리한다.
 * WITHDRAWN 반영 → PENDING 구매 요청 취소 → cart/refreshToken 삭제를 한 트랜잭션으로 수행한다.
 */
export const withdrawUser = async ({
  userId,
  companyId,
}: WithdrawUserParams) => {
  return prisma.$transaction(async (transaction) => {
    const now = new Date();

    const updateResult = await transaction.user.updateMany({
      where: {
        id: userId,
        companyId,
        status: UserStatus.ACTIVE,
        role: {
          not: UserRole.SUPER_ADMIN,
        },
      },
      data: {
        status: UserStatus.WITHDRAWN,
        withdrawnAt: now,
      },
    });

    if (updateResult.count === 0) {
      return false;
    }

    await transaction.order.updateMany({
      where: {
        requesterId: userId,
        status: OrderStatus.PENDING,
      },
      data: {
        status: OrderStatus.CANCELLED,
      },
    });

    await transaction.cartItem.deleteMany({
      where: {
        userId,
      },
    });

    await transaction.refreshToken.deleteMany({
      where: {
        userId,
      },
    });

    return true;
  });
};
