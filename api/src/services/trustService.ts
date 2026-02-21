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
  // Plantilla tipo de fideicomiso [ONBOARDING]
  trustTypeId?: string | null;
  trustTypeConfig?: Record<string, unknown> | null; // ej. { presupuestoTotal } para CONSTRUCCION
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
  // Iteración 1: tipo y rendición
  trustType?: 'INVESTMENT' | 'CONDOMINIUM';
  reportPeriodicity?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  fiscalYearEndMonth?: number;
  fiscalYearEndDay?: number;
  observationDays?: number;
  requiresConsensus?: boolean;
  // [ONBOARDING] identificación y firma
  fechaFirma?: Date | string | null;
  lugarFirma?: string | null;
  jurisdiccion?: string | null;
  domicilioLegal?: string | null;
  domicilioFiscal?: string | null;
  baseCurrency?: string | null;
  fechaCierreEjercicioDay?: number | null;
  fechaCierreEjercicioMonth?: number | null;
  fechaObjetivoEntrega?: Date | string | null;
  reglasExtincionResumen?: string | null;
  objetoTexto?: string | null;
  finalidadCategoria?: string | null;
  anexosObligatorios?: unknown[] | null;
  moraAutomatica?: boolean;
  diasGracia?: number | null;
  permisosPortal?: Record<string, unknown> | null;
  // [POST] metadatos
  tags?: string[];
  notasInternas?: string | null;
}

/** Reglas por tipo: CONSTRUCCION requiere presupuestoTotal en trustTypeConfig; FINANCIERO requiere initialCapital */
export const TRUST_TYPE_CODES = { FINANCIERO: 'FINANCIERO', CONSTRUCCION: 'CONSTRUCCION', ADMINISTRATIVO: 'ADMINISTRATIVO' } as const;

export interface TrustSummary {
  trustId: string;
  name: string | null;
  initialCapital: Decimal;
  bondLimitPercent: Decimal | null;
  otherLimitPercent: Decimal | null;
  active: boolean;
  totalAssets: number;
  totalInvested: Decimal;
  bondInvestment: Decimal;
  otherInvestment: Decimal;
  bondPercent: number;
  otherPercent: number;
  /** Score 0-100 del fideicomiso (Iteración 7): aportes, presupuesto, hitos */
  score?: number;
  scoreFactors?: { contributions?: number; budget?: number; milestones?: number };
}

/**
 * Lista los tipos de fideicomiso (plantillas) con sus reglas [ONBOARDING]
 */
export async function getTrustTypes() {
  return await prisma.trustType.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  });
}

/**
 * Obtiene un tipo de fideicomiso por ID (para auditoría y metadata por tipo)
 */
export async function getTrustTypeById(id: string | null): Promise<{ id: string; code: string; name: string } | null> {
  if (!id?.trim()) return null;
  const row = await prisma.trustType.findUnique({
    where: { id: id.trim() },
    select: { id: true, code: true, name: true },
  });
  return row;
}

/**
 * Obtiene la configuración de un fideicomiso
 */
export async function getTrust(trustId: string) {
  const trust = await prisma.trust.findUnique({
    where: { trustId },
    include: {
      fiduciarioFee: true,
      trustTypeRef: true,
    },
  });

  if (!trust) {
    throw new Error(`Fideicomiso ${trustId} no encontrado`);
  }

  return trust;
}

/**
 * Obtiene fideicomisos (activos por defecto; opcionalmente todos para admin).
 * Incluye trustTypeRef para tipo y moneda en la UI.
 */
export async function getAllTrusts(opts?: { includeInactive?: boolean }) {
  return await prisma.trust.findMany({
    where: opts?.includeInactive ? undefined : { active: true },
    include: {
      trustTypeRef: true,
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
 * [ONBOARDING]: tipo (trustTypeId), nombre, fechas, etc. Status arranca en DRAFT.
 */
export async function createTrust(data: TrustData) {
  console.log('📋 createTrust llamado con:', {
    trustId: data.trustId || '(se generará)',
    name: data.name,
    initialCapital: data.initialCapital,
    trustTypeId: data.trustTypeId,
  });

  let trustTypeCode: string | null = null;
  if (data.trustTypeId) {
    const typeRow = await prisma.trustType.findUnique({ where: { id: data.trustTypeId } });
    if (!typeRow) throw new Error('trustTypeId no corresponde a un tipo de fideicomiso válido');
    trustTypeCode = typeRow.code;
    // Construcción: requiere monto (presupuestoTotal) en trustTypeConfig
    if (trustTypeCode === TRUST_TYPE_CODES.CONSTRUCCION) {
      const monto = data.trustTypeConfig && typeof data.trustTypeConfig === 'object' && 'presupuestoTotal' in data.trustTypeConfig
        ? Number((data.trustTypeConfig as { presupuestoTotal?: number }).presupuestoTotal)
        : undefined;
      if (monto == null || isNaN(monto) || monto <= 0) {
        throw new Error('Para fideicomiso de construcción es requerido trustTypeConfig.presupuestoTotal (monto mayor a cero)');
      }
    }
  }

  // Financiero/inversión: initialCapital requerido; construcción puede usar 0 y solo presupuestoTotal
  const isConstruction = trustTypeCode === TRUST_TYPE_CODES.CONSTRUCCION;
  const initialCap = data.initialCapital == null ? 0 : (typeof data.initialCapital === 'number' ? data.initialCapital : Number(data.initialCapital));
  if (!isConstruction && (!data.initialCapital || (typeof initialCap === 'number' && (isNaN(initialCap) || initialCap <= 0)))) {
    throw new Error('initialCapital debe ser un número mayor a cero');
  }
  const initialCapitalDecimal = new Decimal(isConstruction && initialCap <= 0 && data.trustTypeConfig && typeof data.trustTypeConfig === 'object' && 'presupuestoTotal' in data.trustTypeConfig
    ? Number((data.trustTypeConfig as { presupuestoTotal?: number }).presupuestoTotal)
    : (initialCap || 0));

  // Generar trustId automáticamente si no se proporciona
  const trustId = data.trustId || await generateTrustId();
  console.log('✅ TrustId generado/obtenido:', trustId);

  const existing = await prisma.trust.findUnique({ where: { trustId } });
  if (existing) throw new Error(`El fideicomiso ${trustId} ya existe`);

  // Calcular fecha de expiración
  let expirationDate: Date | undefined;
  if (data.constitutionDate && data.maxTermYears) {
    const constitutionDateObj = typeof data.constitutionDate === 'string' ? new Date(data.constitutionDate) : data.constitutionDate;
    if (!isNaN(constitutionDateObj.getTime())) {
      expirationDate = new Date(constitutionDateObj);
      expirationDate.setFullYear(expirationDate.getFullYear() + data.maxTermYears);
    }
  }

  let finalTermType = data.termType || 'STANDARD';
  let finalMaxTermYears = data.maxTermYears ?? (finalTermType === 'FOREIGN' ? 50 : finalTermType === 'DISABILITY' ? 70 : 30);
  if (finalTermType === 'STANDARD' && finalMaxTermYears > 30) finalMaxTermYears = 30;
  else if (finalTermType === 'FOREIGN' && finalMaxTermYears > 50) finalMaxTermYears = 50;
  else if (finalTermType === 'DISABILITY' && finalMaxTermYears > 70) finalMaxTermYears = 70;

  const toDate = (v: Date | string | undefined | null): Date | null =>
    v == null ? null : (typeof v === 'string' ? new Date(v) : v);

  const legacyTrustType = data.trustType ?? (trustTypeCode === TRUST_TYPE_CODES.CONSTRUCCION ? 'CONDOMINIUM' : 'INVESTMENT');

  console.log('💾 Creando registro en base de datos...');
  const trust = await prisma.trust.create({
    data: {
      trustId,
      name: data.name ?? null,
      trustTypeId: data.trustTypeId ?? null,
      trustType: legacyTrustType,
      trustTypeConfig: (data.trustTypeConfig ?? undefined) as import('../generated/prisma/client').Prisma.InputJsonValue | undefined,
      status: 'DRAFT',
      initialCapital: initialCapitalDecimal,
      // Límites de inversión solo para tipo FINANCIERO; Construcción/Administrativo quedan en null
      bondLimitPercent: isConstruction ? null : (data.bondLimitPercent != null ? new Decimal(data.bondLimitPercent) : new Decimal(30)),
      otherLimitPercent: isConstruction ? null : (data.otherLimitPercent != null ? new Decimal(data.otherLimitPercent) : new Decimal(70)),
      constitutionDate: toDate(data.constitutionDate) ?? new Date(),
      expirationDate: expirationDate ?? null,
      maxTermYears: finalMaxTermYears,
      termType: finalTermType,
      requiresConsensus: data.requiresConsensus ?? false,
      reportPeriodicity: data.reportPeriodicity ?? 'MONTHLY',
      fiscalYearEndMonth: data.fiscalYearEndMonth ?? null,
      fiscalYearEndDay: data.fiscalYearEndDay ?? null,
      observationDays: data.observationDays ?? null,
      fideicomitenteName: data.fideicomitenteName ?? null,
      fideicomitenteRFC: data.fideicomitenteRFC ?? null,
      fiduciarioName: data.fiduciarioName ?? null,
      fiduciarioRFC: data.fiduciarioRFC ?? null,
      rfc: data.rfc ?? null,
      satRegistrationNumber: data.satRegistrationNumber ?? null,
      satRegisteredAt: toDate(data.satRegisteredAt ?? null),
      fechaFirma: toDate(data.fechaFirma ?? null),
      lugarFirma: data.lugarFirma ?? null,
      jurisdiccion: data.jurisdiccion ?? null,
      domicilioLegal: data.domicilioLegal ?? null,
      domicilioFiscal: data.domicilioFiscal ?? null,
      baseCurrency: data.baseCurrency ?? 'ARS',
      fechaCierreEjercicioDay: data.fechaCierreEjercicioDay ?? null,
      fechaCierreEjercicioMonth: data.fechaCierreEjercicioMonth ?? null,
      fechaObjetivoEntrega: toDate(data.fechaObjetivoEntrega ?? null),
      reglasExtincionResumen: data.reglasExtincionResumen ?? null,
      objetoTexto: data.objetoTexto ?? null,
      finalidadCategoria: data.finalidadCategoria ?? null,
      anexosObligatorios: (data.anexosObligatorios ?? undefined) as import('../generated/prisma/client').Prisma.InputJsonValue | undefined,
      moraAutomatica: data.moraAutomatica ?? false,
      diasGracia: data.diasGracia ?? null,
      permisosPortal: (data.permisosPortal ?? undefined) as import('../generated/prisma/client').Prisma.InputJsonValue | undefined,
      tags: data.tags ?? [],
      notasInternas: data.notasInternas ?? null,
    },
  });
  console.log('✅ Fideicomiso creado:', trust.trustId, { trustTypeId: trust.trustTypeId, baseCurrency: trust.baseCurrency, hasConfig: !!data.trustTypeConfig });

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

  // Devolver el trust con trustTypeRef para que el frontend muestre tipo y moneda en la tarjeta
  const withType = await prisma.trust.findUnique({
    where: { trustId: trust.trustId },
    include: { trustTypeRef: true },
  });
  if (withType) return withType;
  // Fallback: si el refetch no devuelve (p. ej. réplica con lag), adjuntar tipo por trustTypeId
  if (trust.trustTypeId) {
    const typeRow = await prisma.trustType.findUnique({
      where: { id: trust.trustTypeId },
      select: { id: true, code: true, name: true },
    });
    if (typeRow) {
      return { ...trust, trustTypeRef: typeRow };
    }
  }
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

  // Validar que la suma no exceda 100% (límites pueden ser null en Construcción/Administrativo)
  const newBondLimit = updateData.bondLimitPercent ?? trust.bondLimitPercent ?? new Decimal(0);
  const newOtherLimit = updateData.otherLimitPercent ?? trust.otherLimitPercent ?? new Decimal(0);

  if (newBondLimit.add(newOtherLimit).gt(100)) {
    throw new Error('La suma de los límites no puede exceder el 100%');
  }

  return await prisma.trust.update({
    where: { trustId },
    data: updateData,
  });
}

/** TrustStatus del schema (DRAFT | ACTIVO | CERRADO) */
const TRUST_STATUSES = ['DRAFT', 'ACTIVO', 'CERRADO'] as const;

/**
 * Actualiza estado del fideicomiso: activo/inactivo (baja) y/o status (DRAFT, ACTIVO, CERRADO).
 * Solo SUPER_ADMIN.
 */
export async function updateTrustStatus(
  trustId: string,
  data: { active?: boolean; status?: string }
) {
  await getTrust(trustId);
  const updateData: { active?: boolean; status?: (typeof TRUST_STATUSES)[number] } = {};
  if (data.active !== undefined) updateData.active = data.active;
  if (data.status !== undefined) {
    if (!TRUST_STATUSES.includes(data.status as any)) {
      throw new Error('status debe ser DRAFT, ACTIVO o CERRADO');
    }
    updateData.status = data.status as (typeof TRUST_STATUSES)[number];
  }
  if (Object.keys(updateData).length === 0) {
    throw new Error('Indique active y/o status para actualizar');
  }
  return await prisma.trust.update({
    where: { trustId },
    data: updateData,
    include: { trustTypeRef: true },
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

  // Score del fideicomiso (Iteración 7): aportes al día, presupuesto, hitos
  let score: number | undefined;
  let scoreFactors: { contributions?: number; budget?: number; milestones?: number } | undefined;
  const contributions = await prisma.contribution.findMany({ where: { trustId } });
  const totalContrib = contributions.length;
  const paidOnTime = contributions.filter((c) => c.status === 'PAID' && c.paidAt && c.paidAt <= c.dueDate).length;
  const contribScore = totalContrib > 0 ? (paidOnTime / totalContrib) * 100 : undefined;

  const budgetItems = await prisma.budgetItem.findMany({ where: { trustId }, include: { expenses: true } });
  let budgetScore: number | undefined;
  if (budgetItems.length > 0) {
    const totalBudget = budgetItems.reduce((s, b) => s + Number(b.amount), 0);
    const totalSpent = budgetItems.reduce((s, b) => s + b.expenses.reduce((e, x) => e + Number(x.amount), 0), 0);
    budgetScore = totalBudget > 0 ? Math.min(100, 100 - (Math.max(0, totalSpent - totalBudget) / totalBudget) * 100) : 100;
  }

  const milestones = await prisma.milestone.findMany({ where: { trustId } });
  const totalMilestone = milestones.length;
  const completedOnTime = milestones.filter((m) => m.completedAt && m.dueDate && m.completedAt <= m.dueDate).length;
  const milestoneScore = totalMilestone > 0 ? (completedOnTime / totalMilestone) * 100 : undefined;

  if (contribScore != null || budgetScore != null || milestoneScore != null) {
    scoreFactors = { contributions: contribScore, budget: budgetScore, milestones: milestoneScore };
    const values = [contribScore, budgetScore, milestoneScore].filter((v) => v != null) as number[];
    score = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : undefined;
  }

  return {
    trustId: trust.trustId,
    name: trust.name,
    initialCapital: trust.initialCapital,
    bondLimitPercent: trust.bondLimitPercent,
    otherLimitPercent: trust.otherLimitPercent,
    active: trust.active,
    totalAssets: allAssets.length,
    totalInvested,
    bondInvestment,
    otherInvestment,
    bondPercent,
    otherPercent,
    score,
    scoreFactors,
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
