/**
 * Reglas de inversión según Contrato 10045
 * 
 * Límites de inversión:
 * - 30%: Bonos federales o instrumentos de renta fija (GovernmentBond)
 * - 70%: Valores aprobados por CNBV o vivienda social/préstamos (MortgageLoan, InsuranceReserve, etc.)
 */

import { AssetType, ComplianceStatus } from '../generated/prisma/enums';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';

export interface InvestmentRuleResult {
  compliant: boolean;
  status: ComplianceStatus;
  message: string;
  details?: {
    currentPercent: number;
    limitPercent: number;
    totalInvested: Decimal;
    limitAmount: Decimal;
  };
}

export interface InvestmentRuleContext {
  trustId: string;
  initialCapital: Decimal;
  existingAssets: Array<{
    assetType: AssetType;
    valueMxn: Decimal;
  }>;
  newAsset: {
    assetType: AssetType;
    valueMxn: Decimal;
  };
  bondLimitPercent?: number; // Por defecto 30%
  otherLimitPercent?: number; // Por defecto 70%
}

/**
 * Valida el límite de inversión en bonos gubernamentales (30%)
 */
export function validateBondLimit(context: InvestmentRuleContext): InvestmentRuleResult {
  const bondLimit = context.bondLimitPercent ?? 30;
  const limitAmount = context.initialCapital.mul(bondLimit).div(100);

  // Calcular inversión actual en bonos
  const currentBondInvestment = context.existingAssets
    .filter(asset => asset.assetType === AssetType.GovernmentBond)
    .reduce((sum, asset) => sum.add(asset.valueMxn), new Decimal(0));

  // Si el nuevo activo es un bono, agregarlo al cálculo
  const newBondInvestment = context.newAsset.assetType === AssetType.GovernmentBond
    ? currentBondInvestment.add(context.newAsset.valueMxn)
    : currentBondInvestment;

  const currentPercent = newBondInvestment.div(context.initialCapital).mul(100).toNumber();
  const exceedsLimit = newBondInvestment.gt(limitAmount);

  return {
    compliant: !exceedsLimit,
    status: exceedsLimit ? ComplianceStatus.NON_COMPLIANT : ComplianceStatus.COMPLIANT,
    message: exceedsLimit
      ? `Límite de inversión en bonos excedido: ${currentPercent.toFixed(2)}% (límite: ${bondLimit}%)`
      : `Inversión en bonos dentro del límite: ${currentPercent.toFixed(2)}% (límite: ${bondLimit}%)`,
    details: {
      currentPercent,
      limitPercent: bondLimit,
      totalInvested: newBondInvestment,
      limitAmount,
    },
  };
}

/**
 * Valida el límite de inversión en otros activos (70%)
 * Incluye: MortgageLoan, InsuranceReserve, CNBVApproved, SocialHousing
 */
export function validateOtherAssetsLimit(context: InvestmentRuleContext): InvestmentRuleResult {
  const otherLimit = context.otherLimitPercent ?? 70;
  const limitAmount = context.initialCapital.mul(otherLimit).div(100);

  // Tipos de activos que cuentan para el límite del 70%
  const otherAssetTypes = [
    AssetType.MortgageLoan,
    AssetType.InsuranceReserve,
    AssetType.CNBVApproved,
    AssetType.SocialHousing,
  ];

  // Calcular inversión actual en otros activos
  const currentOtherInvestment = context.existingAssets
    .filter(asset => otherAssetTypes.includes(asset.assetType as any))
    .reduce((sum, asset) => sum.add(asset.valueMxn), new Decimal(0));

  // Si el nuevo activo es de tipo "otro", agregarlo al cálculo
  const isNewAssetOtherType = otherAssetTypes.includes(context.newAsset.assetType as any);
  const newOtherInvestment = isNewAssetOtherType
    ? currentOtherInvestment.add(context.newAsset.valueMxn)
    : currentOtherInvestment;

  const currentPercent = newOtherInvestment.div(context.initialCapital).mul(100).toNumber();
  const exceedsLimit = newOtherInvestment.gt(limitAmount);

  return {
    compliant: !exceedsLimit,
    status: exceedsLimit ? ComplianceStatus.NON_COMPLIANT : ComplianceStatus.COMPLIANT,
    message: exceedsLimit
      ? `Límite de inversión en otros activos excedido: ${currentPercent.toFixed(2)}% (límite: ${otherLimit}%)`
      : `Inversión en otros activos dentro del límite: ${currentPercent.toFixed(2)}% (límite: ${otherLimit}%)`,
    details: {
      currentPercent,
      limitPercent: otherLimit,
      totalInvested: newOtherInvestment,
      limitAmount,
    },
  };
}

/**
 * Valida todas las reglas de inversión para un activo nuevo
 */
export function validateInvestmentRules(context: InvestmentRuleContext): InvestmentRuleResult[] {
  const results: InvestmentRuleResult[] = [];

  // Validar límite de bonos (solo si el nuevo activo es un bono)
  if (context.newAsset.assetType === AssetType.GovernmentBond) {
    results.push(validateBondLimit(context));
  }

  // Validar límite de otros activos (si el nuevo activo es de tipo "otro")
  const otherAssetTypes = [
    AssetType.MortgageLoan,
    AssetType.InsuranceReserve,
    AssetType.CNBVApproved,
    AssetType.SocialHousing,
  ];
  if (otherAssetTypes.includes(context.newAsset.assetType as any)) {
    results.push(validateOtherAssetsLimit(context));
  }

  return results;
}
