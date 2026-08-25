import prisma from "../config/db";

type MonthlySpending = {
  spent: number;
  productAmount: number;
  shippingFee: number;
  categories: { name: string; amount: number }[];
};

async function findMonthlySpendingSnapshot(
  companyId: string,
  yearMonth: string,
): Promise<MonthlySpending | null> {
  const snapshot = await prisma.monthlySpendingSnapshot.findUnique({
    where: { companyId_yearMonth: { companyId, yearMonth } },
    include: {
      categories: {
        select: { categoryName: true, amount: true },
      },
    },
  });

  if (!snapshot) {
    return null;
  }

  return {
    spent: snapshot.spent,
    productAmount: snapshot.productAmount,
    shippingFee: snapshot.shippingFee,
    categories: snapshot.categories.map((category) => ({
      name: category.categoryName,
      amount: category.amount,
    })),
  };
}

async function upsertMonthlySpendingSnapshot(params: {
  companyId: string;
  yearMonth: string;
  spending: MonthlySpending;
}) {
  const { companyId, yearMonth, spending } = params;
  const categories = spending.categories.map((category) => ({
    categoryName: category.name,
    amount: category.amount,
  }));

  await prisma.monthlySpendingSnapshot.upsert({
    where: { companyId_yearMonth: { companyId, yearMonth } },
    create: {
      companyId,
      yearMonth,
      productAmount: spending.productAmount,
      shippingFee: spending.shippingFee,
      spent: spending.spent,
      categories: { createMany: { data: categories } },
    },
    update: {
      productAmount: spending.productAmount,
      shippingFee: spending.shippingFee,
      spent: spending.spent,
      categories: {
        deleteMany: {},
        createMany: { data: categories },
      },
    },
  });
}

export default {
  findMonthlySpendingSnapshot,
  upsertMonthlySpendingSnapshot,
};
