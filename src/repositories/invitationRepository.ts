import { InvitationRole, Prisma, UserStatus } from "@prisma/client";
import prisma from "../config/db";

const WITHDRAWAL_RECOVERY_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const userInvitationSelect = {
  id: true,
  companyId: true,
  status: true,
  withdrawnAt: true,
} as const;

const invitationSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  expiresAt: true,
} as const;

export type InvitationUserSnapshot = {
  id: string;
  companyId: string;
  status: UserStatus;
  withdrawnAt: Date | null;
};

type CreateInvitationData = {
  companyId: string;
  name: string;
  email: string;
  role: InvitationRole;
  tokenHash: string;
  expiresAt: Date;
};

/**
 * 초대 대상 이메일이 차단되어야 하면 true
 * (ACTIVE, 복구 기간 내 WITHDRAWN, withdrawnAt 없는 WITHDRAWN)
 * 복구 기간이 지난 WITHDRAWN은 false → 동일/타 회사 모두 재초대 가능
 */
export const isInviteeBlocked = (
  existingUser: InvitationUserSnapshot | null,
  now: Date,
) => {
  if (!existingUser) {
    return false;
  }

  if (existingUser.status === UserStatus.ACTIVE) {
    return true;
  }

  if (existingUser.status !== UserStatus.WITHDRAWN) {
    return false;
  }

  // withdrawnAt 없으면 복구 기한 계산 불가 → 초대 차단
  if (!existingUser.withdrawnAt) {
    return true;
  }

  const recoveryDeadlineMs =
    existingUser.withdrawnAt.getTime() +
    WITHDRAWAL_RECOVERY_DAYS * DAY_IN_MS;

  return recoveryDeadlineMs >= now.getTime();
};

export const findUserByEmailForInvitation = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    select: userInvitationSelect,
  });
};

export const findValidInvitation = async (
  companyId: string,
  email: string,
  now: Date,
) => {
  return prisma.invitation.findFirst({
    where: {
      companyId,
      email,
      isUsed: false,
      expiresAt: {
        gt: now,
      },
    },
    select: {
      id: true,
      expiresAt: true,
    },
  });
};

/**
 * 초대 대상 유저 상태 + 유효 초대 중복을 트랜잭션 안에서 검사한 뒤 생성
 * (동시 가입/동시 초대 레이스 완화)
 */
export const createInvitationIfNotExists = async (
  data: CreateInvitationData,
  now: Date,
) => {
  return prisma.$transaction(
    async (transaction) => {
      const existingUser = await transaction.user.findUnique({
        where: {
          email: data.email,
        },
        select: userInvitationSelect,
      });

      if (isInviteeBlocked(existingUser, now)) {
        return { status: "USER_ALREADY_EXISTS" as const };
      }

      const existingInvitation = await transaction.invitation.findFirst({
        where: {
          companyId: data.companyId,
          email: data.email,
          isUsed: false,
          expiresAt: {
            gt: now,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingInvitation) {
        return { status: "ALREADY_EXISTS" as const };
      }

      const invitation = await transaction.invitation.create({
        data,
        select: invitationSelect,
      });

      return {
        status: "CREATED" as const,
        invitation,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
};

export const deleteInvitation = async (invitationId: number) => {
  return prisma.invitation.delete({
    where: {
      id: invitationId,
    },
  });
};

export const findInvitationByTokenHash = async (tokenHash: string) => {
  return prisma.invitation.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      expiresAt: true,
      isUsed: true,
      company: {
        select: {
          name: true,
        },
      },
    },
  });
};
