-- CreateTable
CREATE TABLE "monthly_spending_snapshots" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "yearMonth" VARCHAR NOT NULL,
    "productAmount" INTEGER NOT NULL,
    "shippingFee" INTEGER NOT NULL,
    "spent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_spending_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_category_spending_snapshots" (
    "id" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "categoryName" VARCHAR NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_category_spending_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_spending_snapshots_companyId_yearMonth_key"
ON "monthly_spending_snapshots"("companyId", "yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_category_spending_snapshots_snapshotId_categoryName_key"
ON "monthly_category_spending_snapshots"("snapshotId", "categoryName");

-- AddForeignKey
ALTER TABLE "monthly_spending_snapshots"
ADD CONSTRAINT "monthly_spending_snapshots_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_category_spending_snapshots"
ADD CONSTRAINT "monthly_category_spending_snapshots_snapshotId_fkey"
FOREIGN KEY ("snapshotId") REFERENCES "monthly_spending_snapshots"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
