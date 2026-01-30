/**
 * Trust Service
 * 
 * Gestiona la configuración y operaciones de fideicomisos
 */

import { prisma } from '../lib/prisma';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';

export interface TrustData {
  trustId: string;
  name?: string;
  initialCapital: number | Decimal;
  bondLimitPercent?: number;
  otherLimitPercent?: number;
}

export interface TrustSummary {
  trustId: string;
  name: string | null;
  initialCapital: Decimal;
  bondLimitPercent: Decimal;
  otherLimitPercent: Decimal;
  active: boolean;
  totalAssets: number;
  totalInvested: Decimal;
  bondInvestment: Decimal;
  otherInvestment: Decimal;
  bondPercent: number;
  otherPercent: number;
}

/**
 * Obtiene la configuración de un fideicomiso
 */
export async function getTrust(trustId: string) {
  const trust = await prisma.trust.findUnique({
    where: { trustId },
    include: {
      fiduciarioFee: true,
    },
  });

  if (!trust) {
    throw new Error(`Fideicomiso ${trustId} no encontrado`);
  }

  return trust;
}

/**
 * Crea un nuevo fideicomiso
 */
export async function createTrust(data: TrustData) {
  // Verificar que no exista
  const existing = await prisma.trust.findUnique({
    where: { trustId: data.trustId },
  });

  if (existing) {
    throw new Error(`El fideicomiso ${data.trustId} ya existe`);
  }

  const trust = await prisma.trust.create({
    data: {
      trustId: data.trustId,
      name: data.name,
      initialCapital: new Decimal(data.initialCapital),
      bondLimitPercent: data.bondLimitPercent 
        ? new Decimal(data.bondLimitPercent) 
        : new Decimal(30),
      otherLimitPercent: data.otherLimitPercent 
        ? new Decimal(data.otherLimitPercent) 
        : new Decimal(70),
    },
  });

  // Crear registro de honorarios del fiduciario
  await prisma.fiduciarioFee.create({
    data: {
      trustId: data.trustId,
      studyFee: new Decimal(5000),
      annualFee: new Decimal(18000),
      modificationFee: new Decimal(5000),
      studyFeePaid: false,
      allFeesPaid: false,
    },
  });

  return trust;
}

/**
 * Actualiza los límites de inversión de un fideicomiso
 * Solo puede ser ejecutado por el Comité Técnico
 */
export async function updateTrustLimits(
  trustId: string,
  bondLimitPercent?: number,
  otherLimitPercent?: number
) {
  const trust = await getTrust(trustId);

  const updateData: {
    bondLimitPercent?: Decimal;
    otherLimitPercent?: Decimal;
  } = {};

  if (bondLimitPercent !== undefined) {
    updateData.bondLimitPercent = new Decimal(bondLimitPercent);
  }

  if (otherLimitPercent !== undefined) {
    updateData.otherLimitPercent = new Decimal(otherLimitPercent);
  }

  // Validar que la suma no exceda 100%
  const newBondLimit = updateData.bondLimitPercent || trust.bondLimitPercent;
  const newOtherLimit = updateData.otherLimitPercent || trust.otherLimitPercent;

  if (newBondLimit.add(newOtherLimit).gt(100)) {
    throw new Error('La suma de los límites no puede exceder el 100%');
  }

  return await prisma.trust.update({
    where: { trustId },
    data: updateData,
  });
}

/**
 * Obtiene un resumen del fideicomiso con estadísticas de inversión
 * 
 * IMPORTANTE: Solo cuenta activos que CUMPLEN (COMPLIANT) para los cálculos de porcentajes,
 * ya que los activos que no cumplen no deberían estar invertidos según las reglas.
 * Sin embargo, muestra el total de activos registrados (incluyendo no cumplientes) para transparencia.
 */
export async function getTrustSummary(trustId: string): Promise<TrustSummary> {
  const trust = await getTrust(trustId);

  // Obtener TODOS los activos del fideicomiso (para contar total)
  const allAssets = await prisma.asset.findMany({
    where: {
      trustId,
      complianceStatus: {
        not: 'PENDING_REVIEW',
      },
    },
  });

  // Obtener solo activos que CUMPLEN para cálculos de inversión
  const compliantAssets = allAssets.filter((asset) => asset.compliant);

  // Calcular inversiones SOLO con activos que cumplen
  const totalInvested = compliantAssets.reduce(
    (sum, asset) => sum.add(asset.valueMxn),
    new Decimal(0)
  );

  const bondInvestment = compliantAssets
    .filter((asset) => asset.assetType === 'GovernmentBond')
    .reduce((sum, asset) => sum.add(asset.valueMxn), new Decimal(0));

  const otherInvestment = compliantAssets
    .filter((asset) =>
      ['MortgageLoan', 'InsuranceReserve', 'CNBVApproved', 'SocialHousing'].includes(
        asset.assetType
      )
    )
    .reduce((sum, asset) => sum.add(asset.valueMxn), new Decimal(0));

  // Calcular porcentajes basados en patrimonio inicial
  const bondPercent = trust.initialCapital.gt(0)
    ? bondInvestment.div(trust.initialCapital).mul(100).toNumber()
    : 0;

  const otherPercent = trust.initialCapital.gt(0)
    ? otherInvestment.div(trust.initialCapital).mul(100).toNumber()
    : 0;

  return {
    trustId: trust.trustId,
    name: trust.name,
    initialCapital: trust.initialCapital,
    bondLimitPercent: trust.bondLimitPercent,
    otherLimitPercent: trust.otherLimitPercent,
    active: trust.active,
    totalAssets: allAssets.length, // Total de activos registrados
    totalInvested, // Solo activos que cumplen
    bondInvestment, // Solo activos que cumplen
    otherInvestment, // Solo activos que cumplen
    bondPercent, // Porcentaje basado en activos que cumplen
    otherPercent, // Porcentaje basado en activos que cumplen
  };
}
