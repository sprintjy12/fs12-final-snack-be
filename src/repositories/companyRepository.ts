import prisma from "../config/db";

async function findAllCompanyIds() {
  return prisma.company.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
}

export default {
  findAllCompanyIds,
};
