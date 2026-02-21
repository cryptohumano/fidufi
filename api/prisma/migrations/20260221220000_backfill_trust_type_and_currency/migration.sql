-- Backfill trustTypeId y baseCurrency para trusts que quedaron sin tipo/moneda (creados antes del flujo por tipo).
-- Así las cards muestran "Construcción" / "Financiero" y la moneda correcta.

-- 1) Poner moneda ARS donde sea null
UPDATE "Trust"
SET "baseCurrency" = 'ARS'
WHERE "baseCurrency" IS NULL;

-- 2) Asignar tipo CONSTRUCCION a trusts con nombre "Construcción" o con presupuestoTotal en config
UPDATE "Trust"
SET "trustTypeId" = (SELECT id FROM "TrustType" WHERE code = 'CONSTRUCCION' LIMIT 1)
WHERE "trustTypeId" IS NULL
  AND (
    "name" ILIKE '%Construcción%'
    OR ("trustTypeConfig" IS NOT NULL AND "trustTypeConfig" ? 'presupuestoTotal')
  );

-- 3) El resto sin tipo: asignar FINANCIERO por defecto (patrimonio/límites)
UPDATE "Trust"
SET "trustTypeId" = (SELECT id FROM "TrustType" WHERE code = 'FINANCIERO' LIMIT 1)
WHERE "trustTypeId" IS NULL;
