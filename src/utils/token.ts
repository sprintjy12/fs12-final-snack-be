import { createHash, randomUUID } from "crypto";
import jwt, {
  JwtPayload,
  JsonWebTokenError,
  TokenExpiredError,
} from "jsonwebtoken";

import { ErrorCodes } from "../constants/errorCodes";
import AppError from "./appError";

type AccessTokenPayload = JwtPayload & {
  sub: string;
  companyId: string;
  role: string;
  type: "access";
};

type CreateAccessTokenData = {
  userId: string;
  companyId: string;
  role: string;
};

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

/**
 * 액세스 토큰 시크릿 키 반환
 * @returns 액세스 토큰 시크릿 키
 */
const getAccessTokenSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET 환경변수가 설정되지 않았습니다.",
    );
  }

  return secret;
};

/**
 * 리프레시 토큰 시크릿 키 반환
 * @returns 리프레시 토큰 시크릿 키
 */
const getRefreshTokenSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_REFRESH_SECRET 환경변수가 설정되지 않았습니다.",
    );
  }

  return secret;
};

/**
 * 액세스 토큰 발급
 * @param userId 유저 ID
 * @param companyId 회사 ID
 * @param role 유저 권한
 * @returns 액세스 토큰
 */
export const createAccessToken = ({
  userId,
  companyId,
  role,
}: CreateAccessTokenData) => {
  return jwt.sign(
    {
      companyId,
      role,
      type: "access",
    },
    getAccessTokenSecret(),
    {
      subject: userId,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    },
  );
};

/**
 * 리프레시 토큰 발급
 * @param userId 유저 ID
 * @returns 리프레시 토큰
 */
export const createRefreshToken = (userId: string) => {
  return jwt.sign(
    {
      type: "refresh",
    },
    getRefreshTokenSecret(),
    {
      subject: userId,
      jwtid: randomUUID(),
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    },
  );
};

/**
 * 액세스 토큰 검증
 * @param token 액세스 토큰
 * @returns 액세스 토큰 페이로드
 */
export const verifyAccessToken = (
  token: string,
): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(
      token,
      getAccessTokenSecret(),
    );

    if (
      typeof decoded === "string" ||
      !decoded.sub ||
      !decoded.companyId ||
      !decoded.role ||
      decoded.type !== "access"
    ) {
      throw new AppError(
        ErrorCodes.AUTH.INVALID_ACCESS_TOKEN,
      );
    }

    return decoded as AccessTokenPayload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof TokenExpiredError) {
      throw new AppError(
        ErrorCodes.AUTH.ACCESS_TOKEN_EXPIRED,
      );
    }

    if (error instanceof JsonWebTokenError) {
      throw new AppError(
        ErrorCodes.AUTH.INVALID_ACCESS_TOKEN,
      );
    }

    throw error;
  }
};

/**
 * 토큰 해시 생성
 * @param token 토큰 원문
 * @returns SHA-256 해시값
 */
export const hashToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};

/**
 * 리프레시 토큰 만료 시각 조회
 * @param token 리프레시 토큰
 * @returns 리프레시 토큰 만료 시각
 */
export const getRefreshTokenExpirationDate = (
  token: string,
) => {
  const decoded = jwt.decode(token);

  if (
    typeof decoded === "string" ||
    !decoded?.exp
  ) {
    throw new Error(
      "리프레시 토큰의 만료 시각을 확인할 수 없습니다.",
    );
  }

  return new Date(decoded.exp * 1000);
};