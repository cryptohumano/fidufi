/**
 * Servicio de Analytics de Cumplimiento
 * 
 * Proporciona insights avanzados sobre el cumplimiento del fideicomiso
 * para ayudar al fiduciario a tomar decisiones informadas.
 */

import { prisma } from '../lib/prisma';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';
import { AssetType, ComplianceStatus } from '../generated/prisma/enums';

export interface ComplianceAnalytics {
  // Métricas de cumplimiento
  complianceRate: number; // % de activos que cumplen
  totalCompliantAssets: number;
  totalNonCompliantAssets: number;
  
  // Límites y espacio disponible
  bondLimit: {
    current: Decimal;
    limit: Decimal;
    percentage: number;
    availableSpace: Decimal;
    status: 'safe' | 'warning' | 'critical'; // safe < 80%, warning 80-95%, critical > 95%
  };
  
  otherLimit: {
    current: Decimal;
    limit: Decimal;
    percentage: number;
    availableSpace: Decimal;
    status: 'safe' | 'warning' | 'critical';
  };
  
  // Distribución de activos
  assetDistribution: {
    byType: Record<AssetType, {
      count: number;
      totalValue: Decimal;
      compliantCount: number;
      nonCompliantCount: number;
    }>;
    byCompliance: {
      compliant: { count: number; totalValue: Decimal };
      nonCompliant: { count: number; totalValue: Decimal };
    };
  };
  
  // Activos por beneficiario
  beneficiaryStats: {
    totalBeneficiaries: number;
    beneficiariesWithAssets: number;
    totalBeneficiaryAssets: number;
    averageAssetsPerBeneficiary: number;
  };
  
  // Patrimonio
  patrimony: {
    initial: Decimal;
    current: Decimal;
    growth: number; // % de crecimiento
    growthAmount: Decimal;
  };
  
  // Alertas
  alerts: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
}

/**
 * Obtiene analytics completos de cumplimiento para un fideicomiso
 */
export async function getComplianceAnalytics(trustId: string): Promise<ComplianceAnalytics> {
  const trust = await prisma.trust.findUnique({
    where: { trustId },
  });

  if (!trust) {
    throw new Error(`Fideicomiso ${trustId} no encontrado`);
  }

  // Obtener todos los activos del fideicomiso
  const allAssets = await prisma.asset.findMany({
    where: {
      trustId,
      complianceStatus: {
        not: 'PENDING_REVIEW',
      },
    },
    include: {
      beneficiary: {
        select: {
          id: true,
        },
      },
    },
  });

  // Separar activos por cumplimiento
  const compliantAssets = allAssets.filter((a) => a.compliant);
  const nonCompliantAssets = allAssets.filter((a) => !a.compliant);

  // Calcular tasa de cumplimiento
  const complianceRate = allAssets.length > 0
    ? (compliantAssets.length / allAssets.length) * 100
    : 100;

  // Calcular inversiones por tipo (solo cumplientes)
  const bondInvestment = compliantAssets
    .filter((a) => a.assetType === 'GovernmentBond')
    .reduce((sum, a) => sum.add(a.valueMxn), new Decimal(0));

  const otherInvestment = compliantAssets
    .filter((a) =>
      ['MortgageLoan', 'InsuranceReserve', 'CNBVApproved', 'SocialHousing'].includes(
        a.assetType
      )
    )
    .reduce((sum, a) => sum.add(a.valueMxn), new Decimal(0));

  // Calcular límites
  const bondLimitAmount = trust.initialCapital.mul(trust.bondLimitPercent).div(100);
  const otherLimitAmount = trust.initialCapital.mul(trust.otherLimitPercent).div(100);

  const bondPercent = trust.initialCapital.gt(0)
    ? bondInvestment.div(trust.initialCapital).mul(100).toNumber()
    : 0;

  const otherPercent = trust.initialCapital.gt(0)
    ? otherInvestment.div(trust.initialCapital).mul(100).toNumber()
    : 0;

  const bondAvailableSpace = bondLimitAmount.sub(bondInvestment);
  const otherAvailableSpace = otherLimitAmount.sub(otherInvestment);

  // Determinar estado de límites
  const getLimitStatus = (percentage: number): 'safe' | 'warning' | 'critical' => {
    if (percentage >= 95) return 'critical';
    if (percentage >= 80) return 'warning';
    return 'safe';
  };

  // Distribución por tipo de activo
  const distributionByType: Record<string, any> = {};
  const assetTypes: AssetType[] = ['GovernmentBond', 'MortgageLoan', 'InsuranceReserve', 'CNBVApproved', 'SocialHousing'];
  
  assetTypes.forEach((type) => {
    const typeAssets = allAssets.filter((a) => a.assetType === type);
    const compliantTypeAssets = typeAssets.filter((a) => a.compliant);
    const nonCompliantTypeAssets = typeAssets.filter((a) => !a.compliant);
    
    distributionByType[type] = {
      count: typeAssets.length,
      totalValue: typeAssets.reduce((sum, a) => sum.add(a.valueMxn), new Decimal(0)),
      compliantCount: compliantTypeAssets.length,
      nonCompliantCount: nonCompliantTypeAssets.length,
    };
  });

  // Distribución por cumplimiento
  const compliantTotalValue = compliantAssets.reduce(
    (sum, a) => sum.add(a.valueMxn),
    new Decimal(0)
  );
  const nonCompliantTotalValue = nonCompliantAssets.reduce(
    (sum, a) => sum.add(a.valueMxn),
    new Decimal(0)
  );

  // Estadísticas de beneficiarios
  const assetsWithBeneficiaries = allAssets.filter((a) => a.beneficiaryId !== null);
  const uniqueBeneficiaries = new Set(
    assetsWithBeneficiaries.map((a) => a.beneficiaryId).filter(Boolean)
  );

  // Calcular patrimonio actual (solo activos cumplientes)
  const currentPatrimony = compliantAssets.reduce(
    (sum, a) => sum.add(a.valueMxn),
    new Decimal(0)
  );
  
  const growthAmount = currentPatrimony.sub(trust.initialCapital);
  const growth = trust.initialCapital.gt(0)
    ? growthAmount.div(trust.initialCapital).mul(100).toNumber()
    : 0;

  // Estadísticas de alertas
  const alerts = await prisma.alert.findMany({
    where: {
      asset: {
        trustId,
      },
      acknowledged: false,
    },
  });

  const criticalAlerts = alerts.filter((a) => a.severity === 'error').length;
  const warningAlerts = alerts.filter((a) => a.severity === 'warning').length;
  const infoAlerts = alerts.filter((a) => a.severity === 'info').length;

  return {
    complianceRate: Math.round(complianceRate * 100) / 100,
    totalCompliantAssets: compliantAssets.length,
    totalNonCompliantAssets: nonCompliantAssets.length,
    
    bondLimit: {
      current: bondInvestment,
      limit: bondLimitAmount,
      percentage: Math.round(bondPercent * 100) / 100,
      availableSpace: bondAvailableSpace, // Mantener el valor real (puede ser negativo si se excede)
      status: getLimitStatus(bondPercent),
    },
    
    otherLimit: {
      current: otherInvestment,
      limit: otherLimitAmount,
      percentage: Math.round(otherPercent * 100) / 100,
      availableSpace: otherAvailableSpace, // Mantener el valor real (puede ser negativo si se excede)
      status: getLimitStatus(otherPercent),
    },
    
    assetDistribution: {
      byType: distributionByType as any,
      byCompliance: {
        compliant: {
          count: compliantAssets.length,
          totalValue: compliantTotalValue,
        },
        nonCompliant: {
          count: nonCompliantAssets.length,
          totalValue: nonCompliantTotalValue,
        },
      },
    },
    
    beneficiaryStats: {
      totalBeneficiaries: uniqueBeneficiaries.size,
      beneficiariesWithAssets: uniqueBeneficiaries.size,
      totalBeneficiaryAssets: assetsWithBeneficiaries.length,
      averageAssetsPerBeneficiary: uniqueBeneficiaries.size > 0
        ? assetsWithBeneficiaries.length / uniqueBeneficiaries.size
        : 0,
    },
    
    patrimony: {
      initial: trust.initialCapital,
      current: currentPatrimony,
      growth: Math.round(growth * 100) / 100,
      growthAmount,
    },
    
    alerts: {
      critical: criticalAlerts,
      warning: warningAlerts,
      info: infoAlerts,
      total: alerts.length,
    },
  };
}

/**
 * Calcula proyección: qué pasaría si se registra un activo de cierto valor
 */
export async function projectCompliance(
  trustId: string,
  assetType: AssetType,
  value: Decimal
): Promise<{
  wouldExceedBondLimit: boolean;
  wouldExceedOtherLimit: boolean;
  newBondPercent: number;
  newOtherPercent: number;
  warnings: string[];
}> {
  const analytics = await getComplianceAnalytics(trustId);
  const trust = await prisma.trust.findUnique({
    where: { trustId },
  });

  if (!trust) {
    throw new Error(`Fideicomiso ${trustId} no encontrado`);
  }

  const warnings: string[] = [];
  let newBondPercent = analytics.bondLimit.percentage;
  let newOtherPercent = analytics.otherLimit.percentage;
  let wouldExceedBondLimit = false;
  let wouldExceedOtherLimit = false;

  if (assetType === 'GovernmentBond') {
    const newBondInvestment = analytics.bondLimit.current.add(value);
    newBondPercent = trust.initialCapital.gt(0)
      ? newBondInvestment.div(trust.initialCapital).mul(100).toNumber()
      : 0;
    
    const bondLimitPercent = trust.bondLimitPercent.toNumber();
    wouldExceedBondLimit = newBondPercent > bondLimitPercent;
    
    if (wouldExceedBondLimit) {
      warnings.push(`Este activo excedería el límite del ${bondLimitPercent}% en bonos gubernamentales`);
    } else if (newBondPercent > bondLimitPercent * 0.95) {
      warnings.push(`Este activo te acercaría al límite del ${bondLimitPercent}% en bonos (${Math.round(newBondPercent * 100) / 100}%)`);
    }
  } else {
    const newOtherInvestment = analytics.otherLimit.current.add(value);
    newOtherPercent = trust.initialCapital.gt(0)
      ? newOtherInvestment.div(trust.initialCapital).mul(100).toNumber()
      : 0;
    
    const otherLimitPercent = trust.otherLimitPercent.toNumber();
    wouldExceedOtherLimit = newOtherPercent > otherLimitPercent;
    
    if (wouldExceedOtherLimit) {
      warnings.push(`Este activo excedería el límite del ${otherLimitPercent}% en otros activos`);
    } else if (newOtherPercent > otherLimitPercent * 0.95) {
      warnings.push(`Este activo te acercaría al límite del ${otherLimitPercent}% en otros activos (${Math.round(newOtherPercent * 100) / 100}%)`);
    }
  }

  return {
    wouldExceedBondLimit,
    wouldExceedOtherLimit,
    newBondPercent: Math.round(newBondPercent * 100) / 100,
    newOtherPercent: Math.round(newOtherPercent * 100) / 100,
    warnings,
  };
}
