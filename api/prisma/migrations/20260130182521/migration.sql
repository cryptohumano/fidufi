-- CreateEnum
CREATE TYPE "ActorRole" AS ENUM ('FIDUCIARIO', 'COMITE_TECNICO', 'AUDITOR', 'REGULADOR');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('GovernmentBond', 'MortgageLoan', 'InsuranceReserve', 'CNBVApproved', 'SocialHousing');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'PENDING_REVIEW', 'EXCEPTION_APPROVED');

-- CreateTable
CREATE TABLE "Actor" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "role" "ActorRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "primaryDid" TEXT,
    "ethereumAddress" TEXT,
    "polkadotAccountId" TEXT,
    "ensName" TEXT,
    "popCredentials" JSONB,

    CONSTRAINT "Actor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "valueMxn" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "documentHash" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "complianceStatus" "ComplianceStatus" NOT NULL,
    "compliant" BOOLEAN NOT NULL,
    "validationResults" JSONB,
    "vcHash" TEXT,
    "blockchainTxHash" TEXT,
    "blockchainNetwork" TEXT,
    "anchoredAt" TIMESTAMP(3),
    "registeredBy" TEXT NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleModification" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB NOT NULL,
    "reason" TEXT,
    "approvedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleModification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trust" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "name" TEXT,
    "initialCapital" DECIMAL(18,2) NOT NULL,
    "bondLimitPercent" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "otherLimitPercent" DECIMAL(5,2) NOT NULL DEFAULT 70,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trust_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiduciarioFee" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "studyFee" DECIMAL(18,2) NOT NULL DEFAULT 5000,
    "annualFee" DECIMAL(18,2) NOT NULL DEFAULT 18000,
    "modificationFee" DECIMAL(18,2) NOT NULL DEFAULT 5000,
    "studyFeePaid" BOOLEAN NOT NULL DEFAULT false,
    "studyFeePaidAt" TIMESTAMP(3),
    "allFeesPaid" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiduciarioFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyFeePayment" (
    "id" TEXT NOT NULL,
    "fiduciarioFeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyFeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Actor_primaryDid_key" ON "Actor"("primaryDid");

-- CreateIndex
CREATE UNIQUE INDEX "Actor_ethereumAddress_key" ON "Actor"("ethereumAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Actor_polkadotAccountId_key" ON "Actor"("polkadotAccountId");

-- CreateIndex
CREATE INDEX "Actor_primaryDid_idx" ON "Actor"("primaryDid");

-- CreateIndex
CREATE INDEX "Actor_ethereumAddress_idx" ON "Actor"("ethereumAddress");

-- CreateIndex
CREATE INDEX "Actor_role_idx" ON "Actor"("role");

-- CreateIndex
CREATE INDEX "Asset_trustId_idx" ON "Asset"("trustId");

-- CreateIndex
CREATE INDEX "Asset_assetType_idx" ON "Asset"("assetType");

-- CreateIndex
CREATE INDEX "Asset_registeredBy_idx" ON "Asset"("registeredBy");

-- CreateIndex
CREATE INDEX "Asset_complianceStatus_idx" ON "Asset"("complianceStatus");

-- CreateIndex
CREATE INDEX "Asset_registeredAt_idx" ON "Asset"("registeredAt");

-- CreateIndex
CREATE INDEX "Alert_assetId_idx" ON "Alert"("assetId");

-- CreateIndex
CREATE INDEX "Alert_actorId_idx" ON "Alert"("actorId");

-- CreateIndex
CREATE INDEX "Alert_acknowledged_idx" ON "Alert"("acknowledged");

-- CreateIndex
CREATE INDEX "RuleModification_trustId_idx" ON "RuleModification"("trustId");

-- CreateIndex
CREATE INDEX "RuleModification_approvedBy_idx" ON "RuleModification"("approvedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Trust_trustId_key" ON "Trust"("trustId");

-- CreateIndex
CREATE INDEX "Trust_trustId_idx" ON "Trust"("trustId");

-- CreateIndex
CREATE INDEX "FiduciarioFee_trustId_idx" ON "FiduciarioFee"("trustId");

-- CreateIndex
CREATE UNIQUE INDEX "FiduciarioFee_trustId_key" ON "FiduciarioFee"("trustId");

-- CreateIndex
CREATE INDEX "MonthlyFeePayment_fiduciarioFeeId_idx" ON "MonthlyFeePayment"("fiduciarioFeeId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyFeePayment_fiduciarioFeeId_year_month_key" ON "MonthlyFeePayment"("fiduciarioFeeId", "year", "month");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "Actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleModification" ADD CONSTRAINT "RuleModification_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "Actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiduciarioFee" ADD CONSTRAINT "FiduciarioFee_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyFeePayment" ADD CONSTRAINT "MonthlyFeePayment_fiduciarioFeeId_fkey" FOREIGN KEY ("fiduciarioFeeId") REFERENCES "FiduciarioFee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
