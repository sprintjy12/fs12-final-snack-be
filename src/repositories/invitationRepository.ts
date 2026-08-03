import { InvitationRole } from "@prisma/client";
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

export const createInvitation = async (data: {
  companyId: string;
  name: string;
  email: string;
  role: InvitationRole;
  tokenHash: string;
  expiresAt: Date;
}) => {
  return prisma.invitation.create({
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      expiresAt: true,
    },
  });
};

export const deleteInvitation = async (invitationId: number) => {
  return prisma.invitation.delete({
    where: {
      id: invitationId,
    },
  });
};