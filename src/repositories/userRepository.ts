import prisma from "../config/db";

/**
 * 내 정보 조회
 * @param userId 유저 ID
 * @returns 유저 및 회사 정보
 */
export const findMyProfile = async (userId: string) => {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      email: true,
      role: true,
      status: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};