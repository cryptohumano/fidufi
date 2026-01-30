-- AlterEnum
ALTER TYPE "ActorRole" ADD VALUE 'BENEFICIARIO';

-- CreateTable
CREATE TABLE "ActorTrust" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "roleInTrust" "ActorRole" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ActorTrust_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActorTrust_actorId_idx" ON "ActorTrust"("actorId");

-- CreateIndex
CREATE INDEX "ActorTrust_trustId_idx" ON "ActorTrust"("trustId");

-- CreateIndex
CREATE INDEX "ActorTrust_active_idx" ON "ActorTrust"("active");

-- CreateIndex
CREATE INDEX "ActorTrust_roleInTrust_idx" ON "ActorTrust"("roleInTrust");

-- CreateIndex
CREATE UNIQUE INDEX "ActorTrust_actorId_trustId_key" ON "ActorTrust"("actorId", "trustId");

-- AddForeignKey
ALTER TABLE "ActorTrust" ADD CONSTRAINT "ActorTrust_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActorTrust" ADD CONSTRAINT "ActorTrust_trustId_fkey" FOREIGN KEY ("trustId") REFERENCES "Trust"("trustId") ON DELETE CASCADE ON UPDATE CASCADE;
