import { Prisma, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";

import { ErrorCodes } from "../constants/errorCodes";
import {
  createRefreshTokenRecord,
  createSuperAdminWithCompany,
  findCompanyByBusinessNumber,
  findUserByEmail,
  findUserForAuthentication,
  findUserForLogin,
  findRefreshTokenByHash,
  rotateRefreshToken,
} from "../repositories/authRepository";
import {
  LoginInput,
  SuperAdminSignupInput,
} from "../schemas/authSchema";
import {
  createAccessToken,
  createRefreshToken,
  getRefreshTokenExpirationDate,
  hashToken,
  verifyRefreshToken,
} from "../utils/token";
import AppError from "../utils/appError";

const PASSWORD_HASH_ROUNDS = 12;

/**
 * 최고 관리자 회원가입
 * @param signupData 회원가입 데이터
 * @returns 최고 관리자 정보
 */
export const signupSuperAdmin = async (
  signupData: SuperAdminSignupInput,
) => {
  const {
    name,
    email,
    password,
    companyName,
    businessNumber,
  } = signupData;

  const existingUser = await findUserByEmail(email); // 이메일 중복 체크

  if (existingUser) {
    throw new AppError(ErrorCodes.AUTH.DUPLICATE_EMAIL); // 이메일 중복 오류
  }

  const existingCompany =
    await findCompanyByBusinessNumber(businessNumber); // 사업자 번호 중복 체크

  if (existingCompany) {
    throw new AppError( // 사업자 번호 중복 오류
      ErrorCodes.COMPANY.DUPLICATE_BUSINESS_NUMBER,
    );
  }

  const passwordHash = await bcrypt.hash( // 비밀번호 해시
    password,
    PASSWORD_HASH_ROUNDS,
  );

  try {
    return await createSuperAdminWithCompany({ // 최고 관리자 생성
      name,
      email,
      passwordHash,
      companyName,
      businessNumber,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError && // 중복 오류 체크
      error.code === "P2002"
    ) {
      const target = Array.isArray(error.meta?.target) // 중복 오류 타겟 체크
        ? error.meta.target
        : [];

      if (target.includes("email")) { // 이메일 중복 오류
        throw new AppError(ErrorCodes.AUTH.DUPLICATE_EMAIL);
      }

      if (target.includes("businessNumber")) { // 사업자 번호 중복 오류
        throw new AppError(
          ErrorCodes.COMPANY.DUPLICATE_BUSINESS_NUMBER,
        );
      }
    }

    throw error;
  }
};

/**
 * 로그인
 * @param loginData 로그인 데이터
 * @returns 로그인 결과
 */
// 사용자가 없을 때도 bcrypt.compare 처리 시간을 동일하게 유지하기 위한 더미 해시
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  "dummy-password",
  PASSWORD_HASH_ROUNDS,
);

export const login = async (loginData: LoginInput) => {
  const { email, password } = loginData;

  const user = await findUserForLogin(email);

  if (!user) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    throw new AppError(
      ErrorCodes.AUTH.INVALID_CREDENTIALS,
    );
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    throw new AppError(
      ErrorCodes.AUTH.INVALID_CREDENTIALS,
    );
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError(
      ErrorCodes.AUTH.INACTIVE_USER,
    );
  }

  const accessToken = createAccessToken({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
  });

  const refreshToken = createRefreshToken(user.id);
  const refreshTokenHash = hashToken(refreshToken);

  const refreshTokenExpiresAt =
    getRefreshTokenExpirationDate(refreshToken);

  await createRefreshTokenRecord({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt: refreshTokenExpiresAt,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  };
};

/**
 * 토큰 재발급
 * @param refreshToken 리프레시 토큰 원문
 * @returns 새로운 액세스 토큰과 리프레시 토큰
 */
export const refreshTokens = async (
  refreshToken: string,
) => {
  const payload = verifyRefreshToken(refreshToken);

  const refreshTokenHash = hashToken(refreshToken);

  const storedRefreshToken =
    await findRefreshTokenByHash(refreshTokenHash);

  if (!storedRefreshToken) {
    throw new AppError(
      ErrorCodes.AUTH.INVALID_REFRESH_TOKEN,
    );
  }

  if (
    storedRefreshToken.userId !== payload.sub
  ) {
    throw new AppError(
      ErrorCodes.AUTH.INVALID_REFRESH_TOKEN,
    );
  }

  const user = await findUserForAuthentication(
    payload.sub,
  );

  if (!user) {
    throw new AppError(
      ErrorCodes.AUTH.INVALID_REFRESH_TOKEN,
    );
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError(
      ErrorCodes.AUTH.INACTIVE_USER,
    );
  }

  const newAccessToken = createAccessToken({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
  });

  const newRefreshToken =
    createRefreshToken(user.id);

  const newRefreshTokenHash =
    hashToken(newRefreshToken);

  const newRefreshTokenExpiresAt =
    getRefreshTokenExpirationDate(
      newRefreshToken,
    );

  await rotateRefreshToken({
    oldRefreshTokenId: storedRefreshToken.id,
    userId: user.id,
    tokenHash: newRefreshTokenHash,
    expiresAt: newRefreshTokenExpiresAt,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};