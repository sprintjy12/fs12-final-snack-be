import { Prisma } from "@prisma/client";
import { ErrorCodes } from "../constants/errorCodes";
import {
  createInvitationIfNotExists,
  createInvitedUserAndUseInvitation,
  deleteInvitation,
  findUserByEmailForInvitation,
  findValidInvitation,
  findInvitationByTokenHash,
  isInviteeBlocked,
} from "../repositories/invitationRepository";
import { 
  CreateInvitationInput,
  InvitedSignupInput,
} from "../schemas/invitationSchema";
import AppError from "../utils/appError";
import bcrypt from "bcrypt";
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

/**
 * 회원 초대 생성 + 이메일 발송
 * - 유저/유효 초대 검사는 TX 안에서 최종 판단
 * - 메일 실패 시 생성한 초대 롤백
 */
export const createMemberInvitation = async (
  companyId: string,
  input: CreateInvitationInput,
) => {
  // 빠른 실패 (최종 가드는 트랜잭션 내부 재검사)
  const existingUser = await findUserByEmailForInvitation(input.email);

  if (isInviteeBlocked(existingUser, new Date())) {
    throw new AppError(ErrorCodes.INVITATION.USER_ALREADY_EXISTS);
  }

  let invitation: {
    id: number;
    name: string;
    email: string;
    role: CreateInvitationInput["role"];
    expiresAt: Date;
  } | null = null;
  let invitationToken = createInvitationToken();

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const now = new Date();
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
          new Date(),
        );

        if (existingInvitation) {
          throw new AppError(ErrorCodes.INVITATION.ALREADY_EXISTS);
        }

        if (attempt < MAX_CREATE_ATTEMPTS - 1) {
          continue;
        }

        throw error;
      }

      // tokenHash unique 충돌은 이메일 중복이 아님 → 토큰 재발급 후 1회 재시도
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
    // 루프가 초대 없이 끝난 경우(이론상 도달하지 않음) — ALREADY_EXISTS로 위장하지 않음
    throw new Error("초대 생성에 실패했습니다.");
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

/**
 * 초대 토큰 검증 (가입 전 프리필용)
 */
export const verifyInvitation = async (token: string) => {
  const tokenHash = hashInvitationToken(token);
  const invitation = await findInvitationByTokenHash(tokenHash);

  if (!invitation) {
    throw new AppError(ErrorCodes.INVITATION.NOT_FOUND);
  }

  if (invitation.isUsed) {
    throw new AppError(ErrorCodes.INVITATION.ALREADY_USED);
  }

  if (invitation.expiresAt <= new Date()) {
    throw new AppError(ErrorCodes.INVITATION.EXPIRED);
  }

  return {
    name: invitation.name,
    email: invitation.email,
    role: invitation.role,
    companyName: invitation.company.name,
    expiresAt: invitation.expiresAt,
  };
};

/**
 * 초대 토큰으로 회원가입
 * - 신규: user create
 * - 복구 기간 지난 WITHDRAWN: 기존 row 재활성화 (초대 생성 정책과 동일)
 */
export const signupInvitedUser = async (
  input: InvitedSignupInput,
) => {
  const tokenHash = hashInvitationToken(input.token);
  const invitation = await findInvitationByTokenHash(tokenHash);

  if (!invitation) {
    throw new AppError(ErrorCodes.INVITATION.NOT_FOUND);
  }

  if (invitation.isUsed) {
    throw new AppError(ErrorCodes.INVITATION.ALREADY_USED);
  }

  if (invitation.expiresAt <= new Date()) {
    throw new AppError(ErrorCodes.INVITATION.EXPIRED);
  }

  // 빠른 실패 (최종 가드는 트랜잭션 내부 isInviteeBlocked)
  const existingUser = await findUserByEmailForInvitation(
    invitation.email,
  );

  if (isInviteeBlocked(existingUser, new Date())) {
    throw new AppError(ErrorCodes.INVITATION.USER_ALREADY_EXISTS);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    const signupResult = await createInvitedUserAndUseInvitation({
      invitationId: invitation.id,
      companyId: invitation.companyId,
      name: invitation.name,
      email: invitation.email,
      passwordHash,
      role: invitation.role,
    });

    if (signupResult.status === "NOT_FOUND") {
      throw new AppError(ErrorCodes.INVITATION.NOT_FOUND);
    }
    
    if (signupResult.status === "ALREADY_USED") {
      throw new AppError(ErrorCodes.INVITATION.ALREADY_USED);
    }
    
    if (signupResult.status === "EXPIRED") {
      throw new AppError(ErrorCodes.INVITATION.EXPIRED);
    }
    
    return signupResult.user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    // 동시 가입 레이스: email unique 충돌
    // - 같은 초대로 winner가 isUsed 설정 후 → ALREADY_USED
    // - 다른 경로로 이미 가입된 이메일 → USER_ALREADY_EXISTS
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = error.meta?.target;

      const isEmailConflict =
        (Array.isArray(target) && target.includes("email")) ||
        (typeof target === "string" && target.includes("email"));

      if (isEmailConflict) {
        const latestInvitation =
          await findInvitationByTokenHash(tokenHash);

        if (latestInvitation?.isUsed) {
          throw new AppError(ErrorCodes.INVITATION.ALREADY_USED);
        }

        throw new AppError(ErrorCodes.INVITATION.USER_ALREADY_EXISTS);
      }
    }

    throw error;
  }
};