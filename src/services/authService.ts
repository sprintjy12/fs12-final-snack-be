import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

import { ErrorCodes } from "../constants/errorCodes";
import {
  createSuperAdminWithCompany,
  findCompanyByBusinessNumber,
  findUserByEmail,
} from "../repositories/authRepository";
import { SuperAdminSignupInput } from "../schemas/authSchema";
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