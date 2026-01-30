-- AlterTable
ALTER TABLE "Actor" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Actor" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "Actor" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterEnum
-- Primero crear el nuevo valor en el enum
ALTER TYPE "ActorRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Actor_email_key" ON "Actor"("email");
CREATE INDEX IF NOT EXISTS "Actor_email_idx" ON "Actor"("email");
CREATE INDEX IF NOT EXISTS "Actor_isSuperAdmin_idx" ON "Actor"("isSuperAdmin");
