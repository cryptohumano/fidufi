import { prisma } from '../lib/prisma';
import { Prisma, Decimal } from '../generated/prisma/internal/prismaNamespace';
import { getTrust } from './trustService';
import { getActorById } from './actorService';
import { ActorRole } from '../generated/prisma/enums';
import { createAuditLog, AuditAction, EntityType } from './auditLogService';

export interface CreateStatementData {
  trustId: string;
  year: number;
  month: number;
  submittedBy: string;
  summary?: any;
  assets?: any;
  transactions?: any;
  documentUrl?: string;
  documentHash?: string;
  requestInfo?: { ipAddress?: string; userAgent?: string };
}

export interface ReviewStatementData {
  status: 'APPROVED' | 'OBSERVED';
  observations?: string;
}

/**
 * Calcula días hábiles entre dos fechas (excluyendo sábados y domingos)
 */
function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // No es domingo (0) ni sábado (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Verifica si un estado de cuenta debe ser auto-aprobado tácitamente
 * Según el contrato: 10 días hábiles sin observaciones = aprobación tácita
 */
async function checkTacitApproval(statementId: string): Promise<boolean> {
  const statement = await prisma.monthlyStatement.findUnique({
    where: { id: statementId },
  });

  if (!statement || statement.status !== 'PENDING') {
    return false;
  }

  const submittedAt = new Date(statement.submittedAt);
  const now = new Date();
  const businessDays = calculateBusinessDays(submittedAt, now);

  // Si han pasado 10 días hábiles sin observaciones, aprobar tácitamente
  if (businessDays >= 10) {
    await prisma.monthlyStatement.update({
      where: { id: statementId },
      data: {
        status: 'TACITLY_APPROVED',
        tacitlyApprovedAt: now,
      },
    });

    // Registrar log de auditoría
    try {
      await createAuditLog({
        actorId: '00000000-0000-0000-0000-000000000000', // Sistema
        action: AuditAction.STATEMENT_TACITLY_APPROVED,
        entityType: EntityType.STATEMENT,
        entityId: statementId,
        trustId: statement.trustId,
        description: `Estado de cuenta ${statement.year}-${statement.month} aprobado tácitamente después de 10 días hábiles sin observaciones`,
        metadata: {
          statementId,
          year: statement.year,
          month: statement.month,
          businessDaysElapsed: businessDays,
        },
      });
    } catch (error) {
      console.error('⚠️  Error registrando log de auditoría:', error);
    }

    return true;
  }

  return false;
}

/**
 * Crea un nuevo estado de cuenta mensual
 */
export async function createStatement(data: CreateStatementData) {
  // 1. Verificar que el fideicomiso existe
  const trust = await getTrust(data.trustId);

  // 2. Verificar que el usuario tiene permisos (solo FIDUCIARIO puede crear estados de cuenta)
  const actor = await getActorById(data.submittedBy);
  if (actor.role !== ActorRole.FIDUCIARIO && !actor.isSuperAdmin) {
    throw new Error('Solo el Fiduciario puede crear estados de cuenta');
  }

  // 3. Verificar pertenencia al fideicomiso (excepto para SUPER_ADMIN)
  if (!actor.isSuperAdmin) {
    const { verifyActorTrustMembership } = await import('./actorTrustService');
    const hasAccess = await verifyActorTrustMembership(
      data.submittedBy,
      data.trustId,
      [ActorRole.FIDUCIARIO]
    );
    
    if (!hasAccess) {
      throw new Error('No tienes acceso a este fideicomiso o no tienes permisos para crear estados de cuenta');
    }
  }

  // 4. Verificar que no existe ya un estado de cuenta para este período
  const existing = await prisma.monthlyStatement.findUnique({
    where: {
      trustId_year_month: {
        trustId: data.trustId,
        year: data.year,
        month: data.month,
      },
    },
  });

  if (existing) {
    throw new Error(`Ya existe un estado de cuenta para ${data.year}-${data.month}`);
  }

  // 5. Calcular fechas del período
  const periodStart = new Date(data.year, data.month - 1, 1);
  const periodEnd = new Date(data.year, data.month, 0); // Último día del mes

  // 6. Obtener activos del fideicomiso al cierre del período
  const assets = await prisma.asset.findMany({
    where: {
      trustId: data.trustId,
      registeredAt: {
        lte: periodEnd,
      },
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
        },
      },
      beneficiary: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // 7. Calcular resumen del patrimonio
  const totalAssets = assets.reduce(
    (sum, asset) => sum.add(asset.valueMxn),
    new Decimal(0)
  );

  const summary = data.summary || {
    initialCapital: trust.initialCapital.toNumber(),
    totalAssets: totalAssets.toNumber(),
    totalCompliantAssets: assets
      .filter((a) => a.compliant)
      .reduce((sum, asset) => sum.add(asset.valueMxn), new Decimal(0))
      .toNumber(),
    totalNonCompliantAssets: assets
      .filter((a) => !a.compliant)
      .reduce((sum, asset) => sum.add(asset.valueMxn), new Decimal(0))
      .toNumber(),
    assetsCount: assets.length,
    compliantAssetsCount: assets.filter((a) => a.compliant).length,
  };

  const assetsData = data.assets || assets.map((asset) => ({
    id: asset.id,
    assetType: asset.assetType,
    valueMxn: asset.valueMxn.toNumber(),
    compliant: asset.compliant,
    complianceStatus: asset.complianceStatus,
    registeredAt: asset.registeredAt,
    registeredBy: asset.actor?.name,
  }));

  // 8. Crear el estado de cuenta
  const statement = await prisma.monthlyStatement.create({
    data: {
      trustId: data.trustId,
      year: data.year,
      month: data.month,
      statementDate: new Date(),
      periodStart,
      periodEnd,
      summary,
      assets: assetsData,
      transactions: data.transactions || null,
      documentUrl: data.documentUrl || null,
      documentHash: data.documentHash || null,
      status: 'PENDING',
    },
    include: {
      trust: {
        select: {
          trustId: true,
          name: true,
        },
      },
    },
  });

  // 9. Registrar log de auditoría
  try {
    await createAuditLog({
      actorId: data.submittedBy,
      action: AuditAction.STATEMENT_CREATED,
      entityType: EntityType.STATEMENT,
      entityId: statement.id,
      trustId: data.trustId,
      description: `Estado de cuenta mensual creado para ${data.year}-${data.month}`,
      metadata: {
        year: data.year,
        month: data.month,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
      ipAddress: data.requestInfo?.ipAddress,
      userAgent: data.requestInfo?.userAgent,
    });
  } catch (error) {
    console.error('⚠️  Error registrando log de auditoría:', error);
  }

  return statement;
}

/**
 * Obtiene un estado de cuenta por ID
 */
export async function getStatementById(statementId: string) {
  const statement = await prisma.monthlyStatement.findUnique({
    where: { id: statementId },
    include: {
      trust: {
        select: {
          trustId: true,
          name: true,
        },
      },
    },
  });

  if (!statement) {
    throw new Error(`Estado de cuenta ${statementId} no encontrado`);
  }

  return statement;
}

/**
 * Lista estados de cuenta de un fideicomiso con filtros opcionales
 */
export async function listStatements(filters: {
  trustId: string;
  year?: number;
  month?: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Prisma.MonthlyStatementWhereInput = {
    trustId: filters.trustId,
  };

  if (filters.year !== undefined) {
    where.year = filters.year;
  }

  if (filters.month !== undefined) {
    where.month = filters.month;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const [statements, total] = await Promise.all([
    prisma.monthlyStatement.findMany({
      where,
      include: {
        trust: {
          select: {
            trustId: true,
            name: true,
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
      take: filters.limit || 100,
      skip: filters.offset || 0,
    }),
    prisma.monthlyStatement.count({ where }),
  ]);

  return {
    statements,
    total,
    limit: filters.limit || 100,
    offset: filters.offset || 0,
  };
}

/**
 * Revisa y aprueba/observa un estado de cuenta
 * Solo el Comité Técnico puede revisar estados de cuenta
 */
export async function reviewStatement(
  statementId: string,
  data: ReviewStatementData,
  reviewedBy: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
) {
  // 1. Verificar que el estado de cuenta existe
  const statement = await getStatementById(statementId);

  // 2. Verificar que está pendiente
  if (statement.status !== 'PENDING') {
    throw new Error(`El estado de cuenta ya fue ${statement.status}`);
  }

  // 3. Verificar permisos (solo Comité Técnico)
  const actor = await getActorById(reviewedBy);
  if (actor.role !== ActorRole.COMITE_TECNICO && !actor.isSuperAdmin) {
    throw new Error('Solo el Comité Técnico puede revisar estados de cuenta');
  }

  // 4. Verificar pertenencia al fideicomiso (excepto para SUPER_ADMIN)
  if (!actor.isSuperAdmin) {
    const { verifyActorTrustMembership } = await import('./actorTrustService');
    const hasAccess = await verifyActorTrustMembership(
      reviewedBy,
      statement.trustId,
      [ActorRole.COMITE_TECNICO]
    );
    
    if (!hasAccess) {
      throw new Error('No tienes acceso a este fideicomiso o no eres miembro del Comité Técnico');
    }
  }

  // 5. Actualizar el estado de cuenta
  const updatedStatement = await prisma.monthlyStatement.update({
    where: { id: statementId },
    data: {
      status: data.status,
      reviewedAt: new Date(),
      reviewedBy: actor.id,
      observations: data.observations || null,
    },
    include: {
      trust: {
        select: {
          trustId: true,
          name: true,
        },
      },
    },
  });

  // 6. Registrar log de auditoría
  try {
    await createAuditLog({
      actorId: reviewedBy,
      action: data.status === 'APPROVED' 
        ? AuditAction.STATEMENT_APPROVED
        : AuditAction.STATEMENT_OBSERVED,
      entityType: EntityType.STATEMENT,
      entityId: statementId,
      trustId: statement.trustId,
      description: `Estado de cuenta ${statement.year}-${statement.month} ${data.status === 'APPROVED' ? 'aprobado' : 'observado'} por Comité Técnico`,
      metadata: {
        statementId,
        year: statement.year,
        month: statement.month,
        status: data.status,
        observations: data.observations || null,
        reviewedBy: actor.id,
        reviewedByName: actor.name,
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });
  } catch (error) {
    console.error('⚠️  Error registrando log de auditoría:', error);
  }

  return updatedStatement;
}

/**
 * Genera automáticamente un estado de cuenta para el mes anterior
 * Se ejecuta al inicio de cada mes para generar el estado del mes anterior
 */
export async function generatePreviousMonthStatement(
  trustId: string,
  submittedBy: string
) {
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = previousMonth.getFullYear();
  const month = previousMonth.getMonth() + 1;

  // Verificar si ya existe
  const existing = await prisma.monthlyStatement.findUnique({
    where: {
      trustId_year_month: {
        trustId,
        year,
        month,
      },
    },
  });

  if (existing) {
    return existing;
  }

  // Crear el estado de cuenta automáticamente
  return await createStatement({
    trustId,
    year,
    month,
    submittedBy,
    requestInfo: {
      ipAddress: 'system',
      userAgent: 'fidufi-automation',
    },
  });
}

/**
 * Verifica y procesa auto-aprobaciones tácitas para todos los estados pendientes
 * Debe ejecutarse periódicamente (ej: cada día)
 */
export async function processTacitApprovals(): Promise<number> {
  const pendingStatements = await prisma.monthlyStatement.findMany({
    where: {
      status: 'PENDING',
    },
  });

  let approvedCount = 0;
  for (const statement of pendingStatements) {
    const wasApproved = await checkTacitApproval(statement.id);
    if (wasApproved) {
      approvedCount++;
    }
  }

  return approvedCount;
}
