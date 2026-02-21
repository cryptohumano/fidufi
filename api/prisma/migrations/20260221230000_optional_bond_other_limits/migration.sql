-- Hacer opcionales bondLimitPercent y otherLimitPercent para que Construcción/Administrativo no tengan parámetros de inversión.
-- Los trusts de inversión (FINANCIERO) siguen teniendo 30/70; los de construcción quedarán en null al crear.

ALTER TABLE "Trust" ALTER COLUMN "bondLimitPercent" DROP NOT NULL;
ALTER TABLE "Trust" ALTER COLUMN "bondLimitPercent" DROP DEFAULT;

ALTER TABLE "Trust" ALTER COLUMN "otherLimitPercent" DROP NOT NULL;
ALTER TABLE "Trust" ALTER COLUMN "otherLimitPercent" DROP DEFAULT;
