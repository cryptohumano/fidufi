-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "beneficiaryId" TEXT;

-- CreateIndex
CREATE INDEX "Asset_beneficiaryId_idx" ON "Asset"("beneficiaryId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Actor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
