import prisma from "../config/db";

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