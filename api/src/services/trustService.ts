/**
 * Trust Service
 * 
 * Gestiona la configuración y operaciones de fideicomisos
 */

import { prisma } from '../lib/prisma';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';

export interface TrustData {
  trustId?: string; // Opcional: se genera automáticamente si no se proporciona
  name?: string;
  initialCapital: number | Decimal;
  bondLimitPercent?: number;
  otherLimitPercent?: number;
  // Información de partes
  fideicomitenteName?: string;
  fideicomitenteRFC?: string;
  fiduciarioName?: string;
  fiduciarioRFC?: string;
  // Plazos y vigencia
  constitutionDate?: Date | string;
  maxTermYears?: number;
  termType?: 'STANDARD' | 'FOREIGN' | 'DISABILITY';
  // Obligaciones fiscales
  rfc?: string;
  satRegistrationNumber?: string;
  satRegisteredAt?: Date | string;
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
 * Obtiene todos los fideicomisos activos
 */
export async function getAllTrusts() {
  return await prisma.trust.findMany({
    where: {
      active: true,
    },
    select: {
      id: true,
      trustId: true,
      name: true,
      initialCapital: true,
      bondLimitPercent: true,
      otherLimitPercent: true,
      active: true,
      createdAt: true,
      // Nuevos campos
      constitutionDate: true,
      expirationDate: true,
      maxTermYears: true,
      termType: true,
      rfc: true,
      satRegisteredAt: true,
    },
    orderBy: { trustId: 'asc' },
  });
}

/**
 * Genera un nuevo ID de fideicomiso único
 * Formato: YYYY-NNNN (ej: 2026-0001, 2026-0002)
 */
async function generateTrustId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  
  // Buscar el último fideicomiso del año actual (formato YYYY-NNNN)
  const lastTrust = await prisma.trust.findFirst({
    where: {
      trustId: {
        startsWith: `${currentYear}-`,
      },
    },
    orderBy: {
      trustId: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastTrust) {
    // Extraer el número del último trustId (formato: YYYY-NNNN)
    const match = lastTrust.trustId.match(/^\d{4}-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Formatear con padding de 4 dígitos
  let trustId = `${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
  
  // Verificar que no exista y buscar el siguiente disponible si es necesario
  let attempts = 0;
  while (attempts < 100) { // Límite de seguridad
    const exists = await prisma.trust.findUnique({
      where: { trustId },
    });

    if (!exists) {
      return trustId;
    }

    // Si existe, intentar con el siguiente número
    nextNumber++;
    trustId = `${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
    attempts++;
  }

  // Si llegamos aquí, algo está muy mal
  throw new Error('No se pudo generar un ID único para el fideicomiso después de múltiples intentos');
}

/**
 * Crea un nuevo fideicomiso
 */
export async function createTrust(data: TrustData) {
  console.log('📋 createTrust llamado con:', {
    trustId: data.trustId || '(se generará)',
    name: data.name,
    initialCapital: data.initialCapital,
    bondLimitPercent: data.bondLimitPercent,
    otherLimitPercent: data.otherLimitPercent,
  });

  // Validar initialCapital
  if (!data.initialCapital || (typeof data.initialCapital === 'number' && (isNaN(data.initialCapital) || data.initialCapital <= 0))) {
    throw new Error('initialCapital debe ser un número mayor a cero');
  }

  // Generar trustId automáticamente si no se proporciona
  const trustId = data.trustId || await generateTrustId();
  console.log('✅ TrustId generado/obtenido:', trustId);
  
  // Verificar que no exista
  const existing = await prisma.trust.findUnique({
    where: { trustId },
  });

  if (existing) {
    throw new Error(`El fideicomiso ${trustId} ya existe`);
  }

  // Calcular fecha de expiración si se proporciona fecha de constitución y plazo máximo
  let expirationDate: Date | undefined;
  if (data.constitutionDate && data.maxTermYears) {
    const constitutionDateObj = typeof data.constitutionDate === 'string' 
      ? new Date(data.constitutionDate) 
      : data.constitutionDate;
    
    // Validar que la fecha sea válida
    if (!isNaN(constitutionDateObj.getTime())) {
      expirationDate = new Date(constitutionDateObj);
      expirationDate.setFullYear(expirationDate.getFullYear() + data.maxTermYears);
    }
  }

  // Validar tipo de plazo y ajustar si es necesario
  let finalTermType = data.termType || 'STANDARD';
  let finalMaxTermYears = data.maxTermYears || 30;

  // Ajustar según tipo de plazo si no se especificó maxTermYears
  if (!data.maxTermYears) {
    if (finalTermType === 'FOREIGN') {
      finalMaxTermYears = 50;
    } else if (finalTermType === 'DISABILITY') {
      finalMaxTermYears = 70;
    }
  }

  // Validar que maxTermYears no exceda el máximo permitido según termType
  if (finalTermType === 'STANDARD' && finalMaxTermYears > 30) {
    finalMaxTermYears = 30;
  } else if (finalTermType === 'FOREIGN' && finalMaxTermYears > 50) {
    finalMaxTermYears = 50;
  } else if (finalTermType === 'DISABILITY' && finalMaxTermYears > 70) {
    finalMaxTermYears = 70;
  }

  console.log('💾 Creando registro en base de datos...');
  const trust = await prisma.trust.create({
    data: {
      trustId,
      name: data.name,
      initialCapital: new Decimal(data.initialCapital),
      bondLimitPercent: data.bondLimitPercent 
        ? new Decimal(data.bondLimitPercent) 
        : new Decimal(30),
      otherLimitPercent: data.otherLimitPercent 
        ? new Decimal(data.otherLimitPercent) 
        : new Decimal(70),
      // Plazos y vigencia
      constitutionDate: data.constitutionDate 
        ? (typeof data.constitutionDate === 'string' ? new Date(data.constitutionDate) : data.constitutionDate)
        : new Date(),
      expirationDate: expirationDate,
      maxTermYears: finalMaxTermYears,
      termType: finalTermType,
      requiresConsensus: data.requiresConsensus || false,
    },
  });
  console.log('✅ Fideicomiso creado:', trust.trustId);

  // Crear registro de honorarios del fiduciario
  await prisma.fiduciarioFee.create({
    data: {
      trustId: trust.trustId, // Usar el trustId generado/creado
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

/**
 * Calcula información del timeline del fideicomiso
 */
export interface TrustTimelineInfo {
  constitutionDate: Date | null;
  expirationDate: Date | null;
  maxTermYears: number | null;
  termType: string | null;
  currentTermYears: number | null;
  remainingTermYears: number | null;
  remainingTermMonths: number | null;
  remainingTermDays: number | null;
  isExpiringSoon: boolean; // true si quedan menos de 1 año
  isExpiringVerySoon: boolean; // true si quedan menos de 6 meses
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL'; // Basado en tiempo restante
}

export function calculateTrustTimeline(trust: {
  constitutionDate: Date | null;
  expirationDate: Date | null;
  maxTermYears: number | null;
  termType: string | null;
}): TrustTimelineInfo {
  const now = new Date();
  const expirationDate = trust.expirationDate;
  const constitutionDate = trust.constitutionDate;

  let currentTermYears: number | null = null;
  let remainingTermYears: number | null = null;
  let remainingTermMonths: number | null = null;
  let remainingTermDays: number | null = null;
  let isExpiringSoon = false;
  let isExpiringVerySoon = false;
  let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

  if (expirationDate) {
    const expiration = new Date(expirationDate);
    const diffMs = expiration.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    remainingTermDays = diffDays;
    remainingTermMonths = Math.floor(diffDays / 30);
    remainingTermYears = Math.floor(diffDays / 365);

    isExpiringSoon = diffDays < 365; // Menos de 1 año
    isExpiringVerySoon = diffDays < 180; // Menos de 6 meses

    if (diffDays < 0) {
      status = 'CRITICAL'; // Ya expiró
    } else if (diffDays < 180) {
      status = 'CRITICAL'; // Menos de 6 meses
    } else if (diffDays < 365) {
      status = 'WARNING'; // Menos de 1 año
    } else {
      status = 'HEALTHY'; // Más de 1 año
    }
  }

  if (constitutionDate) {
    const constitution = new Date(constitutionDate);
    const diffMs = now.getTime() - constitution.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    currentTermYears = Math.floor(diffDays / 365);
  }

  return {
    constitutionDate,
    expirationDate,
    maxTermYears: trust.maxTermYears,
    termType: trust.termType,
    currentTermYears,
    remainingTermYears,
    remainingTermMonths,
    remainingTermDays,
    isExpiringSoon,
    isExpiringVerySoon,
    status,
  };
}

/**
 * Obtiene información de las partes involucradas en el fideicomiso
 */
export interface TrustPartiesInfo {
  fideicomitente: {
    name: string | null;
    rfc: string | null;
  };
  fiduciario: {
    name: string | null;
    rfc: string | null;
  };
  comiteTecnico: Array<{
    actorId: string;
    name: string | null;
    email: string | null;
    assignedAt: Date;
  }>;
  beneficiarios: Array<{
    actorId: string;
    name: string | null;
    email: string | null;
    assetsCount: number;
    totalValue: number;
  }>;
  auditores: Array<{
    actorId: string;
    name: string | null;
    email: string | null;
    assignedAt: Date;
  }>;
  reguladores: Array<{
    actorId: string;
    name: string | null;
    email: string | null;
    assignedAt: Date;
  }>;
}

export async function getTrustParties(trustId: string): Promise<TrustPartiesInfo> {
  const trust = await getTrust(trustId);

  // Obtener miembros del fideicomiso
  const memberships = await prisma.actorTrust.findMany({
    where: {
      trustId,
      active: true,
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Separar por roles
  const comiteTecnico = memberships
    .filter((m) => m.roleInTrust === 'COMITE_TECNICO')
    .map((m) => ({
      actorId: m.actor.id,
      name: m.actor.name,
      email: m.actor.email,
      assignedAt: m.assignedAt,
    }));

  const beneficiarios = memberships
    .filter((m) => m.roleInTrust === 'BENEFICIARIO')
    .map((m) => ({
      actorId: m.actor.id,
      name: m.actor.name,
      email: m.actor.email,
      assignedAt: m.assignedAt,
    }));

  const auditores = memberships
    .filter((m) => m.roleInTrust === 'AUDITOR')
    .map((m) => ({
      actorId: m.actor.id,
      name: m.actor.name,
      email: m.actor.email,
      assignedAt: m.assignedAt,
    }));

  const reguladores = memberships
    .filter((m) => m.roleInTrust === 'REGULADOR')
    .map((m) => ({
      actorId: m.actor.id,
      name: m.actor.name,
      email: m.actor.email,
      assignedAt: m.assignedAt,
    }));

  // Calcular activos por beneficiario
  const beneficiariesWithAssets = await Promise.all(
    beneficiarios.map(async (beneficiary) => {
      const assets = await prisma.asset.findMany({
        where: {
          trustId,
          beneficiaryId: beneficiary.actorId,
        },
      });

      const totalValue = assets.reduce(
        (sum, asset) => sum.add(asset.valueMxn),
        new Decimal(0)
      );

      return {
        ...beneficiary,
        assetsCount: assets.length,
        totalValue: totalValue.toNumber(),
      };
    })
  );

  return {
    fideicomitente: {
      name: trust.fideicomitenteName,
      rfc: trust.fideicomitenteRFC,
    },
    fiduciario: {
      name: trust.fiduciarioName,
      rfc: trust.fiduciarioRFC,
    },
    comiteTecnico,
    beneficiarios: beneficiariesWithAssets,
    auditores,
    reguladores,
  };
}
