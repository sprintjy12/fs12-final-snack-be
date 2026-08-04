import { Prisma } from "@prisma/client";
import { ErrorCodes } from "../constants/errorCodes";
import {
  createInvitationIfNotExists,
  deleteInvitation,
  findUserByEmailForInvitation,
  findValidInvitation,
  isInviteeBlocked,
} from "../repositories/invitationRepository";
import { CreateInvitationInput } from "../schemas/invitationSchema";
import AppError from "../utils/appError";
import {
  createInvitationToken,
  getInvitationExpirationDate,
  hashInvitationToken,
} from "../utils/invitationToken";
import { sendInvitationEmail } from "../utils/sendInvitationEmail";

const MAX_CREATE_ATTEMPTS = 2;

const isTokenHashUniqueViolation = (
  error: Prisma.PrismaClientKnownRequestError,
) => {
  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.includes("tokenHash");
  }

  if (typeof target === "string") {
    return target.includes("tokenHash");
  }

  return false;
};

export const createMemberInvitation = async (
  companyId: string,
  input: CreateInvitationInput,
) => {
  const now = new Date();

  // 빠른 실패 (최종 가드는 트랜잭션 내부 재검사)
  const existingUser = await findUserByEmailForInvitation(input.email);

  if (isInviteeBlocked(existingUser, now)) {
    throw new AppError(ErrorCodes.INVITATION.USER_ALREADY_EXISTS);
  }

  let invitation;
  let invitationToken = createInvitationToken();

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const tokenHash = hashInvitationToken(invitationToken);
    const expiresAt = getInvitationExpirationDate();

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

      if (createResult.status === "USER_ALREADY_EXISTS") {
        throw new AppError(ErrorCodes.INVITATION.USER_ALREADY_EXISTS);
      }

      if (createResult.status === "ALREADY_EXISTS") {
        throw new AppError(ErrorCodes.INVITATION.ALREADY_EXISTS);
      }

      invitation = createResult.invitation;
      break;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
        throw error;
      }

      // 직렬화 충돌: 실제로 유효 초대가 생겼는지 확인 후 매핑
      if (error.code === "P2034") {
        const existingInvitation = await findValidInvitation(
          companyId,
          input.email,
          now,
        );

        if (existingInvitation) {
          throw new AppError(ErrorCodes.INVITATION.ALREADY_EXISTS);
        }

        if (attempt < MAX_CREATE_ATTEMPTS - 1) {
          continue;
        }

        throw error;
      }

      // tokenHash unique 충돌은 거의 없으나 이메일 중복이 아님 → 토큰 재발급 후 1회 재시도
      if (
        error.code === "P2002" &&
        isTokenHashUniqueViolation(error) &&
        attempt < MAX_CREATE_ATTEMPTS - 1
      ) {
        invitationToken = createInvitationToken();
        continue;
      }

      throw error;
    }
  }

  if (!invitation) {
    throw new AppError(ErrorCodes.INVITATION.ALREADY_EXISTS);
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
