-- CreateTable
CREATE TABLE "TrustConcept" (
    "id" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "conceptKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustConcept_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrustConcept_trustId_conceptKey_key" ON "TrustConcept"("trustId", "conceptKey");

-- CreateIndex
CREATE INDEX "TrustConcept_trustId_idx" ON "TrustConcept"("trustId");

-- AddForeignKey
ALTER TABLE "TrustConcept" ADD CONSTRAINT "TrustConcept_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE CASCADE ON UPDATE CASCADE;
