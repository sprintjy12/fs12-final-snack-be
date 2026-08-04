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

export type InvitationUserSnapshot = {
  id: string;
  companyId: string;
  status: UserStatus;
  withdrawnAt: Date | null;
};

/**
 * 초대 대상 이메일이 차단되어야 하면 true
 * (ACTIVE, 복구 기간 내 WITHDRAWN, withdrawnAt 없는 WITHDRAWN)
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

  if (
    existingUser.status === UserStatus.WITHDRAWN &&
    !existingUser.withdrawnAt
  ) {
    return true;
  }

  if (
    existingUser.status === UserStatus.WITHDRAWN &&
    existingUser.withdrawnAt
  ) {
    const recoveryDeadline = new Date(
      existingUser.withdrawnAt.getTime() +
        WITHDRAWAL_RECOVERY_DAYS * DAY_IN_MS,
    );

    return recoveryDeadline >= now;
  }

  return false;
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

type CreateInvitationData = {
  companyId: string;
  name: string;
  email: string;
  role: InvitationRole;
  tokenHash: string;
  expiresAt: Date;
};

const invitationSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  expiresAt: true,
} as const;

export const createInvitation = async (data: CreateInvitationData) => {
  return prisma.invitation.create({
    data,
    select: invitationSelect,
  });
};

/**
 * 유저 ACTIVE 여부 + 유효 초대 존재 여부를 확인한 뒤 생성 (동시 요청 레이스 완화)
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
