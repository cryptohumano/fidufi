-- CreateEnum: estado del fideicomiso [AUTO]
CREATE TYPE "TrustStatus" AS ENUM ('DRAFT', 'ACTIVO', 'CERRADO');

-- CreateTable: plantilla de tipo de fideicomiso (Construcción, Financiero, Administrativo)
CREATE TABLE "TrustType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rulesConfig" JSONB NOT NULL DEFAULT '{}',
    "onboardingFieldsSchema" JSONB DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrustType_code_key" ON "TrustType"("code");
CREATE INDEX "TrustType_code_idx" ON "TrustType"("code");
CREATE INDEX "TrustType_isActive_idx" ON "TrustType"("isActive");

-- Seed: tipos de fideicomiso con reglas por tipo
INSERT INTO "TrustType" ("id", "code", "name", "description", "rulesConfig", "onboardingFieldsSchema", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'FINANCIERO', 'Financiero (Inversión)', 'Fideicomiso de inversión. Reglas: patrimonio inicial, límites bonos/otros.', '{"initialCapitalRequired": true, "bondLimitPercent": 30, "otherLimitPercent": 70, "requiresAssetCompliance": true}'::jsonb, '["name", "initialCapital", "bondLimitPercent", "otherLimitPercent", "constitutionDate", "baseCurrency", "fechaCierreEjercicioMonth", "fechaCierreEjercicioDay"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'CONSTRUCCION', 'Construcción', 'Fideicomiso de obra/construcción. Reglas: presupuesto total, hitos, certificaciones.', '{"presupuestoTotalRequired": true, "requiresMilestones": true, "requiresBudgetItems": true}'::jsonb, '["name", "presupuestoTotal", "fechaObjetivoEntrega", "constitutionDate", "baseCurrency", "objetoTexto", "finalidadCategoria"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'ADMINISTRATIVO', 'Administrativo', 'Fideicomiso administrativo. Reglas configurables según contrato.', '{}'::jsonb, '["name", "constitutionDate", "baseCurrency", "objetoTexto", "finalidadCategoria"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable Trust: tipo plantilla, estado, campos ONBOARDING/POST
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "trustTypeId" TEXT;
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "trustTypeConfig" JSONB DEFAULT '{}';
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "status" "TrustStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "fechaFirma" TIMESTAMP(3);
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "lugarFirma" TEXT;
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "jurisdiccion" TEXT;
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "domicilioLegal" TEXT;
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "domicilioFiscal" TEXT;
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "baseCurrency" TEXT DEFAULT 'ARS';
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "fechaCierreEjercicioDay" INTEGER;
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "fechaCierreEjercicioMonth" INTEGER;
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "fechaObjetivoEntrega" TIMESTAMP(3);
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "reglasExtincionResumen" TEXT;
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "objetoTexto" TEXT;
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "finalidadCategoria" TEXT;
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "anexosObligatorios" JSONB DEFAULT '[]';
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "moraAutomatica" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "diasGracia" INTEGER;
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "permisosPortal" JSONB DEFAULT '{}';
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Trust" ADD COLUMN IF NOT EXISTS "notasInternas" TEXT;

-- Existing trusts: mark as ACTIVO (they were already in use)
UPDATE "Trust" SET "status" = 'ACTIVO' WHERE "status" = 'DRAFT';

-- FK Trust.trustTypeId -> TrustType.id (after TrustType exists and we may seed it)
ALTER TABLE "Trust" ADD CONSTRAINT "Trust_trustTypeId_fkey" 
  FOREIGN KEY ("trustTypeId") REFERENCES "TrustType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Trust_trustTypeId_idx" ON "Trust"("trustTypeId");
CREATE INDEX "Trust_status_idx" ON "Trust"("status");
