import { UserStatus } from "@prisma/client";
import { ErrorCodes } from "../constants/errorCodes";
import {
  createInvitation,
  deleteInvitation,
  findUserByEmailForInvitation,
  findValidInvitation,
} from "../repositories/invitationRepository";
import { CreateInvitationInput } from "../schemas/invitationSchema";
import AppError from "../utils/appError";
import {
  createInvitationToken,
  getInvitationExpirationDate,
  hashInvitationToken,
} from "../utils/invitationToken";
import { sendInvitationEmail } from "../utils/sendInvitationEmail";

const WITHDRAWAL_RECOVERY_DAYS = 7;

export const createMemberInvitation = async (
  companyId: string,
  input: CreateInvitationInput,
) => {
  const now = new Date();

  const existingUser = await findUserByEmailForInvitation(input.email);

  if (existingUser) {
    if (existingUser.status === UserStatus.ACTIVE) {
      throw new AppError(ErrorCodes.INVITATION.USER_ALREADY_EXISTS);
    }

    if (
      existingUser.status === UserStatus.WITHDRAWN &&
      existingUser.withdrawnAt
    ) {
      const recoveryDeadline = new Date(existingUser.withdrawnAt);

      recoveryDeadline.setDate(
        recoveryDeadline.getDate() + WITHDRAWAL_RECOVERY_DAYS,
      );

      if (recoveryDeadline >= now) {
        throw new AppError(ErrorCodes.INVITATION.USER_ALREADY_EXISTS);
      }
    }

    if (
      existingUser.status === UserStatus.WITHDRAWN &&
      !existingUser.withdrawnAt
    ) {
      throw new AppError(ErrorCodes.INVITATION.USER_ALREADY_EXISTS);
    }
  }

  const existingInvitation = await findValidInvitation(
    companyId,
    input.email,
    now,
  );

  if (existingInvitation) {
    throw new AppError(ErrorCodes.INVITATION.ALREADY_EXISTS);
  }

  const invitationToken = createInvitationToken();
  const tokenHash = hashInvitationToken(invitationToken);
  const expiresAt = getInvitationExpirationDate();

  const invitation = await createInvitation({
    companyId,
    name: input.name,
    email: input.email,
    role: input.role,
    tokenHash,
    expiresAt,
  });

  try {
    await sendInvitationEmail(
      input.email,
      input.name,
      invitationToken,
    );
  } catch (error) {
    await deleteInvitation(invitation.id);
    throw error;
  }

  return invitation;
};