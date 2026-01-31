-- CreateTable
CREATE TABLE "MonthlyStatement" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "summary" JSONB NOT NULL,
    "assets" JSONB NOT NULL,
    "transactions" JSONB,
    "documentUrl" TEXT,
    "documentHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "observations" TEXT,
    "tacitlyApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyStatement_trustId_idx" ON "MonthlyStatement"("trustId");

-- CreateIndex
CREATE INDEX "MonthlyStatement_year_month_idx" ON "MonthlyStatement"("year", "month");

-- CreateIndex
CREATE INDEX "MonthlyStatement_status_idx" ON "MonthlyStatement"("status");

-- CreateIndex
CREATE INDEX "MonthlyStatement_statementDate_idx" ON "MonthlyStatement"("statementDate");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyStatement_trustId_year_month_key" ON "MonthlyStatement"("trustId", "year", "month");

-- AddForeignKey
ALTER TABLE "MonthlyStatement" ADD CONSTRAINT "MonthlyStatement_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE CASCADE ON UPDATE CASCADE;
