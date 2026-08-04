import { Prisma, UserStatus } from "@prisma/client";
import { ErrorCodes } from "../constants/errorCodes";
import {
  createInvitationIfNotExists,
  deleteInvitation,
  findUserByEmailForInvitation,
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
const DAY_IN_MS = 24 * 60 * 60 * 1000;

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
      const recoveryDeadline = new Date(
        existingUser.withdrawnAt.getTime() +
          WITHDRAWAL_RECOVERY_DAYS * DAY_IN_MS,
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

  const invitationToken = createInvitationToken();
  const tokenHash = hashInvitationToken(invitationToken);
  const expiresAt = getInvitationExpirationDate();

  let invitation;

  try {
    const createResult = await createInvitationIfNotExists(
      {
        companyId,
        name: input.name,
        email: input.email,
        role: input.role,
        tokenHash,
        expiresAt,
      },
      now,
    );

    if (createResult.status === "ALREADY_EXISTS") {
      throw new AppError(ErrorCodes.INVITATION.ALREADY_EXISTS);
    }

    invitation = createResult.invitation;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    // 직렬화 충돌(동시 트랜잭션) 시 유효 초대 경합으로 간주
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2034" || error.code === "P2002")
    ) {
      throw new AppError(ErrorCodes.INVITATION.ALREADY_EXISTS);
    }

    throw error;
  }

  try {
    await sendInvitationEmail(
      input.email,
      input.name,
      invitationToken,
    );
  } catch (error) {
    try {
      await deleteInvitation(invitation.id);
    } catch (deleteError) {
      console.error(
        "Failed to delete invitation after email send failure:",
        deleteError,
      );
    }

    throw error;
  }

  return invitation;
};
