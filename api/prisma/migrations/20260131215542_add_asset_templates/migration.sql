-- CreateTable
CREATE TABLE "AssetTemplate" (
    "id" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "trustId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultFields" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetTemplate_assetType_idx" ON "AssetTemplate"("assetType");

-- CreateIndex
CREATE INDEX "AssetTemplate_trustId_idx" ON "AssetTemplate"("trustId");

-- CreateIndex
CREATE INDEX "AssetTemplate_isDefault_idx" ON "AssetTemplate"("isDefault");

-- CreateIndex
CREATE INDEX "AssetTemplate_isActive_idx" ON "AssetTemplate"("isActive");

-- CreateIndex
CREATE INDEX "AssetTemplate_createdBy_idx" ON "AssetTemplate"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "AssetTemplate_assetType_trustId_name_key" ON "AssetTemplate"("assetType", "trustId", "name");

-- AddForeignKey
ALTER TABLE "AssetTemplate" ADD CONSTRAINT "AssetTemplate_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetTemplate" ADD CONSTRAINT "AssetTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
