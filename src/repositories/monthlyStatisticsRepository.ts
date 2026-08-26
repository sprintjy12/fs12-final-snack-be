import prisma from "../config/db";
import { performance } from "node:perf_hooks";

const PERFORMANCE_SAMPLE_SIZE = 100;
const snapshotPerformanceSamples = new Map<string, number[]>();

function recordSnapshotPerformance(yearMonth: string, durationMs: number) {
  const samples = snapshotPerformanceSamples.get(yearMonth) ?? [];
  samples.push(durationMs);

  if (samples.length < PERFORMANCE_SAMPLE_SIZE) {
    snapshotPerformanceSamples.set(yearMonth, samples);
    return;
  }

  const batch = samples.splice(0, PERFORMANCE_SAMPLE_SIZE);
  const sorted = [...batch].sort((a, b) => a - b);
  const average = batch.reduce((sum, value) => sum + value, 0) / batch.length;
  const percentile = (ratio: number) =>
    sorted[Math.ceil(sorted.length * ratio) - 1];

  console.info("[performance][monthly-statistics-summary]", {
    source: "snapshot",
    yearMonth,
    sampleSize: batch.length,
    averageMs: Number(average.toFixed(2)),
    medianMs: Number(percentile(0.5).toFixed(2)),
    p95Ms: Number(percentile(0.95).toFixed(2)),
    minMs: Number(sorted[0].toFixed(2)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
  });

  if (samples.length === 0) {
    snapshotPerformanceSamples.delete(yearMonth);
  } else {
    snapshotPerformanceSamples.set(yearMonth, samples);
  }
}

export type MonthlySpending = {
  spent: number;
  productAmount: number;
  shippingFee: number;
  categories: { name: string; amount: number }[];
};

async function findMonthlySpendingSnapshot(
  companyId: string,
  yearMonth: string,
): Promise<MonthlySpending | null> {
  const startedAt = performance.now();
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

  recordSnapshotPerformance(yearMonth, performance.now() - startedAt);

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
  const createCategories =
    categories.length > 0 ? { createMany: { data: categories } } : undefined;

  await prisma.monthlySpendingSnapshot.upsert({
    where: { companyId_yearMonth: { companyId, yearMonth } },
    create: {
      companyId,
      yearMonth,
      productAmount: spending.productAmount,
      shippingFee: spending.shippingFee,
      spent: spending.spent,
      categories: createCategories,
    },
    update: {
      productAmount: spending.productAmount,
      shippingFee: spending.shippingFee,
      spent: spending.spent,
      categories: {
        deleteMany: {},
        ...(createCategories ?? {}),
      },
    },
  });
}

export default {
  findMonthlySpendingSnapshot,
  upsertMonthlySpendingSnapshot,
};
