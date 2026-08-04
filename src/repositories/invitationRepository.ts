import { InvitationRole, Prisma } from "@prisma/client";
import prisma from "../config/db";

export const findUserByEmailForInvitation = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      companyId: true,
      status: true,
      withdrawnAt: true,
    },
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
 * 유효 초대 존재 여부를 확인한 뒤 생성 (동시 요청 레이스 완화)
 * @returns 생성 결과 또는 이미 존재
 */
export const createInvitationIfNotExists = async (
  data: CreateInvitationData,
  now: Date,
) => {
  return prisma.$transaction(
    async (transaction) => {
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
