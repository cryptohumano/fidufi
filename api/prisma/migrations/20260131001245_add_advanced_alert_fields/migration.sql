-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_assetId_fkey";

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "alertSubtype" TEXT,
ADD COLUMN     "alertType" TEXT,
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "assetId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Alert_alertType_idx" ON "Alert"("alertType");

-- CreateIndex
CREATE INDEX "Alert_alertSubtype_idx" ON "Alert"("alertSubtype");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
