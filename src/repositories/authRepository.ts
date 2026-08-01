import { Prisma, UserRole } from "@prisma/client";
import prisma from "../config/db";

type CreateSuperAdminWithCompanyData = {
  name: string;
  email: string;
  passwordHash: string;
  companyName: string;
  businessNumber: string;
};

/**
 * 유저 인증 정보 조회
 * @param userId 유저 ID
 * @returns 유저 인증 정보
 */
export const findUserForAuthentication = async (userId: string) => {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      companyId: true,
      role: true,
      status: true,
    },
  });
};

/**
 * 이메일로 유저 조회
 * @param email 이메일
 * @returns 유저 정보
 */
export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });
};

/**
 * 로그인용 유저 조회
 * @param email 이메일
 * @returns 로그인에 필요한 유저 정보
 */
export const findUserForLogin = async (email: string) => {
  return prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
    },
  });
};

/**
 * 사업자 번호로 회사 조회
 * @param businessNumber 사업자 번호
 * @returns 회사 정보
 */
export const findCompanyByBusinessNumber = async (
  businessNumber: string,
) => {
  return prisma.company.findUnique({
    where: {
      businessNumber,
    },
    select: {
      id: true,
    },
  });
};

/**
 * 최고 관리자 생성
 * @param name 이름
 * @param email 이메일
 * @param passwordHash 비밀번호 해시
 * @param companyName 회사명
 * @param businessNumber 사업자 번호
 * @returns 최고 관리자 정보
 */
export const createSuperAdminWithCompany = async ({
  name,
  email,
  passwordHash,
  companyName,
  businessNumber,
}: CreateSuperAdminWithCompanyData) => {
  return prisma.$transaction(
    async (transaction: Prisma.TransactionClient) => {
      const company = await transaction.company.create({
        data: {
          name: companyName,
          businessNumber,
        },
        select: {
          id: true,
          name: true,
          businessNumber: true,
          createdAt: true,
        },
      });

      const user = await transaction.user.create({
        data: {
          companyId: company.id,
          name,
          email,
          passwordHash,
          role: UserRole.SUPER_ADMIN,
        },
        select: {
          id: true,
          companyId: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      return {
        company,
        user,
      };
    },
  );
};

type CreateRefreshTokenData = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

/**
 * 리프레시 토큰 정보 저장
 * @param userId 유저 ID
 * @param tokenHash 리프레시 토큰 해시
 * @param expiresAt 리프레시 토큰 만료 시각
 * @returns 저장된 리프레시 토큰 정보
 */
export const createRefreshTokenRecord = async ({
  userId,
  tokenHash,
  expiresAt,
}: CreateRefreshTokenData) => {
  return prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      createdAt: true,
    },
  });
};