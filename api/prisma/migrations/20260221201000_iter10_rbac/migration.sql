-- AlterEnum: add new ActorRole values (Iteración 10: RBAC fino)
ALTER TYPE "ActorRole" ADD VALUE IF NOT EXISTS 'FIDUCIARIO_ADMIN';
ALTER TYPE "ActorRole" ADD VALUE IF NOT EXISTS 'FIDUCIARIO_OPERATOR';
ALTER TYPE "ActorRole" ADD VALUE IF NOT EXISTS 'ADQUIRENTE';

-- AlterTable: partyType on ActorTrust (etiqueta por contrato)
ALTER TABLE "ActorTrust" ADD COLUMN IF NOT EXISTS "partyType" TEXT;
