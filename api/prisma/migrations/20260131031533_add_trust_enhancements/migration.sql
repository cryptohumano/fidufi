-- AlterTable
ALTER TABLE "Trust" ADD COLUMN     "constitutionDate" TIMESTAMP(3),
ADD COLUMN     "expirationDate" TIMESTAMP(3),
ADD COLUMN     "fideicomitenteName" TEXT,
ADD COLUMN     "fideicomitenteRFC" TEXT,
ADD COLUMN     "fiduciarioName" TEXT,
ADD COLUMN     "fiduciarioRFC" TEXT,
ADD COLUMN     "maxTermYears" INTEGER,
ADD COLUMN     "rfc" TEXT,
ADD COLUMN     "satRegisteredAt" TIMESTAMP(3),
ADD COLUMN     "satRegistrationNumber" TEXT,
ADD COLUMN     "termType" TEXT,
ADD COLUMN     "terminationDate" TIMESTAMP(3),
ADD COLUMN     "terminationReason" TEXT,
ADD COLUMN     "terminationType" TEXT,
ADD COLUMN     "transmissionCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Trust_expirationDate_idx" ON "Trust"("expirationDate");

-- CreateIndex
CREATE INDEX "Trust_active_idx" ON "Trust"("active");
