-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('MONEY', 'GOOD', 'SERVICE');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- AlterTable
ALTER TABLE "Trust" ADD COLUMN     "fiscalYearEndDay" INTEGER,
ADD COLUMN     "fiscalYearEndMonth" INTEGER,
ADD COLUMN     "observationDays" INTEGER,
ADD COLUMN     "reportPeriodicity" TEXT DEFAULT 'MONTHLY',
ADD COLUMN     "trustType" TEXT DEFAULT 'INVESTMENT';

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "contributorId" TEXT,
    "concept" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "contributionType" "ContributionType" NOT NULL DEFAULT 'MONEY',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
    "evidenceUrl" TEXT,
    "evidenceHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashflowPlan" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "schedule" JSONB NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashflowPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "budgetItemId" TEXT,
    "concept" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "expenseType" TEXT,
    "paidAt" TIMESTAMP(3),
    "fiduciaryAccountId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportingDocument" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "documentUrl" TEXT,
    "documentHash" TEXT,
    "docType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiduciaryAccount" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountNumber" TEXT,
    "bankName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiduciaryAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankMovement" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balance" DECIMAL(18,2),
    "reference" TEXT,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledWith" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractDocument" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentUrl" TEXT,
    "documentHash" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAnnex" (
    "id" TEXT NOT NULL,
    "contractDocumentId" TEXT NOT NULL,
    "annexType" TEXT,
    "name" TEXT NOT NULL,
    "documentUrl" TEXT,
    "documentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAnnex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "policyType" TEXT NOT NULL,
    "insurer" TEXT,
    "policyNumber" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "documentUrl" TEXT,
    "documentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contribution_trustId_idx" ON "Contribution"("trustId");

-- CreateIndex
CREATE INDEX "Contribution_contributorId_idx" ON "Contribution"("contributorId");

-- CreateIndex
CREATE INDEX "Contribution_status_idx" ON "Contribution"("status");

-- CreateIndex
CREATE INDEX "Contribution_dueDate_idx" ON "Contribution"("dueDate");

-- CreateIndex
CREATE INDEX "BudgetItem_trustId_idx" ON "BudgetItem"("trustId");

-- CreateIndex
CREATE INDEX "CashflowPlan_trustId_idx" ON "CashflowPlan"("trustId");

-- CreateIndex
CREATE INDEX "Expense_trustId_idx" ON "Expense"("trustId");

-- CreateIndex
CREATE INDEX "Expense_budgetItemId_idx" ON "Expense"("budgetItemId");

-- CreateIndex
CREATE INDEX "Expense_paidAt_idx" ON "Expense"("paidAt");

-- CreateIndex
CREATE INDEX "SupportingDocument_expenseId_idx" ON "SupportingDocument"("expenseId");

-- CreateIndex
CREATE INDEX "FiduciaryAccount_trustId_idx" ON "FiduciaryAccount"("trustId");

-- CreateIndex
CREATE INDEX "BankMovement_accountId_idx" ON "BankMovement"("accountId");

-- CreateIndex
CREATE INDEX "BankMovement_date_idx" ON "BankMovement"("date");

-- CreateIndex
CREATE INDEX "BankMovement_reconciled_idx" ON "BankMovement"("reconciled");

-- CreateIndex
CREATE INDEX "ContractDocument_trustId_idx" ON "ContractDocument"("trustId");

-- CreateIndex
CREATE INDEX "ContractDocument_docType_idx" ON "ContractDocument"("docType");

-- CreateIndex
CREATE INDEX "ContractAnnex_contractDocumentId_idx" ON "ContractAnnex"("contractDocumentId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_trustId_idx" ON "InsurancePolicy"("trustId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_endDate_idx" ON "InsurancePolicy"("endDate");

-- CreateIndex
CREATE INDEX "Trust_trustType_idx" ON "Trust"("trustType");

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashflowPlan" ADD CONSTRAINT "CashflowPlan_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportingDocument" ADD CONSTRAINT "SupportingDocument_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiduciaryAccount" ADD CONSTRAINT "FiduciaryAccount_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankMovement" ADD CONSTRAINT "BankMovement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FiduciaryAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAnnex" ADD CONSTRAINT "ContractAnnex_contractDocumentId_fkey" FOREIGN KEY ("contractDocumentId") REFERENCES "ContractDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE CASCADE ON UPDATE CASCADE;
