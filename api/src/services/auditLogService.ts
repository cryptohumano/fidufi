/**
 * Servicio de Logs de Auditoría
 * 
 * Registra todas las acciones críticas realizadas por usuarios en el sistema
 * para cumplir con requisitos de trazabilidad y auditoría.
 */

import { prisma } from '../lib/prisma';

// Tipos de acciones que se pueden registrar
export enum AuditAction {
  // Activos
  ASSET_REGISTERED = 'ASSET_REGISTERED',
  ASSET_UPDATED = 'ASSET_UPDATED',
  EXCEPTION_APPROVED = 'EXCEPTION_APPROVED',
  EXCEPTION_REJECTED = 'EXCEPTION_REJECTED',
  ASSET_TEMPLATE_CREATED = 'ASSET_TEMPLATE_CREATED',
  ASSET_TEMPLATE_UPDATED = 'ASSET_TEMPLATE_UPDATED',
  ASSET_TEMPLATE_DELETED = 'ASSET_TEMPLATE_DELETED',
  
  // Usuarios
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  
  // Autenticación
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  
  // Fideicomisos
  TRUST_CREATED = 'TRUST_CREATED',
  TRUST_UPDATED = 'TRUST_UPDATED',
  TRUST_LIMITS_MODIFIED = 'TRUST_LIMITS_MODIFIED',
  
  // Reglas
  RULE_MODIFIED = 'RULE_MODIFIED',
  
  // Alertas
  ALERT_ACKNOWLEDGED = 'ALERT_ACKNOWLEDGED',
  ALERT_GENERATED = 'ALERT_GENERATED',
  
  // Honorarios
  FEE_PAID = 'FEE_PAID',
  FEE_OVERDUE = 'FEE_OVERDUE',
  
  // Asignaciones
  ACTOR_ASSIGNED_TO_TRUST = 'ACTOR_ASSIGNED_TO_TRUST',
  ACTOR_REMOVED_FROM_TRUST = 'ACTOR_REMOVED_FROM_TRUST',
  
  // Sesiones del Comité Técnico
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_UPDATED = 'SESSION_UPDATED',
  SESSION_COMPLETED = 'SESSION_COMPLETED',
  SESSION_CANCELLED = 'SESSION_CANCELLED',
  
  // Estados de Cuenta Mensuales
  STATEMENT_CREATED = 'STATEMENT_CREATED',
  STATEMENT_APPROVED = 'STATEMENT_APPROVED',
  STATEMENT_OBSERVED = 'STATEMENT_OBSERVED',
  STATEMENT_TACITLY_APPROVED = 'STATEMENT_TACITLY_APPROVED',
}

// Tipos de entidades
export enum EntityType {
  ASSET = 'Asset',
  ACTOR = 'Actor',
  TRUST = 'Trust',
  ALERT = 'Alert',
  RULE_MODIFICATION = 'RuleModification',
  FIDUCIARIO_FEE = 'FiduciarioFee',
  ACTOR_TRUST = 'ActorTrust',
  SESSION = 'Session',
  STATEMENT = 'Statement',
}

export interface CreateAuditLogData {
  actorId: string;
  action: AuditAction | string;
  entityType?: EntityType | string;
  entityId?: string;
  trustId?: string;
  description: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Crea un log de auditoría
 * 
 * Nota: Para acciones del sistema (como login fallido), se puede usar
 * un actorId especial como 'system' o null. En ese caso, no se incluirá
 * la relación con Actor.
 */
// UUID especial para acciones del sistema
const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Crea un log de auditoría
 * 
 * Nota: Para acciones del sistema (como login fallido), se usa
 * un UUID especial. El seed debe crear un actor con este ID.
 */
export async function createAuditLog(data: CreateAuditLogData) {
  try {
    // Verificar si es una acción del sistema
    const isSystemAction = data.actorId === SYSTEM_ACTOR_ID;
    
    // Si no es acción del sistema, verificar que el actor existe
    if (!isSystemAction) {
      const actor = await prisma.actor.findUnique({
        where: { id: data.actorId },
      });

      if (!actor) {
        console.warn(`⚠️  Actor ${data.actorId} no encontrado para log de auditoría`);
        return null;
      }
    }

    const log = await prisma.auditLog.create({
      data: {
        actorId: data.actorId,
        action: data.action,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        trustId: data.trustId || null,
        description: data.description,
        metadata: isSystemAction
          ? {
              ...(data.metadata || {}),
              systemAction: true,
            }
          : data.metadata || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
      include: {
        actor: isSystemAction
          ? false // No incluir actor para acciones del sistema (será null)
          : {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
      },
    });
    return log;
  } catch (error: any) {
    // No fallar la operación principal si el logging falla
    console.error('⚠️  Error creando log de auditoría:', error.message);
    return null;
  }
}

/**
 * Obtiene logs de auditoría con filtros opcionales
 */
export async function getAuditLogs(filters: {
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  trustId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  _specialFilter?: string;
  _actorId?: string;
}) {
  const where: any = {};

  // Manejar filtro especial para COMITE_TECNICO y FIDUCIARIO
  if (filters._specialFilter === 'comiteOrFiduciarioAll') {
    // Hacer dos consultas separadas y combinar resultados:
    // 1. Todos los logs de activos
    // 2. Logs propios de otras entidades
    
    const baseFilters: any = {};
    if (filters.action) baseFilters.action = filters.action;
    if (filters.entityId) baseFilters.entityId = filters.entityId;
    if (filters.trustId) baseFilters.trustId = filters.trustId;
    if (filters.startDate || filters.endDate) {
      baseFilters.createdAt = {};
      if (filters.startDate) baseFilters.createdAt.gte = filters.startDate;
      if (filters.endDate) baseFilters.createdAt.lte = filters.endDate;
    }

    // Consulta 1: Todos los logs de activos
    const assetLogsWhere = {
      ...baseFilters,
      entityType: 'Asset',
    };

    // Consulta 2: Logs propios de otras entidades o sin entidad
    const ownLogsWhere = {
      ...baseFilters,
      actorId: filters._actorId,
      OR: [
        { entityType: { not: 'Asset' } },
        { entityType: null },
      ],
    };

    // Ejecutar ambas consultas
    const [assetLogs, ownLogs, assetTotal, ownTotal] = await Promise.all([
      prisma.auditLog.findMany({
        where: assetLogsWhere,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.findMany({
        where: ownLogsWhere,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where: assetLogsWhere }),
      prisma.auditLog.count({ where: ownLogsWhere }),
    ]);

    // Combinar y ordenar resultados
    const allLogs = [...assetLogs, ...ownLogs];
    const uniqueLogs = Array.from(
      new Map(allLogs.map(log => [log.id, log])).values()
    );
    uniqueLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Aplicar paginación manualmente
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    const paginatedLogs = uniqueLogs.slice(offset, offset + limit);
    const total = assetTotal + ownTotal;

    // Agregar información del sistema a los logs
    const logsWithSystemInfo = paginatedLogs.map((log) => {
      if (!log.actor && log.actorId === '00000000-0000-0000-0000-000000000000') {
        return {
          ...log,
          actor: {
            id: log.actorId,
            name: 'Sistema',
            email: 'system@fidufi.mx',
            role: 'SYSTEM',
          },
        };
      }
      return log;
    });

    return {
      logs: logsWithSystemInfo,
      total,
      limit,
      offset,
    };
  }

  // Lógica normal de filtrado
  if (filters.actorId) {
    where.actorId = filters.actorId;
  }

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.entityType) {
    where.entityType = filters.entityType;
  }

  if (filters.entityId) {
    where.entityId = filters.entityId;
  }

  if (filters.trustId) {
    where.trustId = filters.trustId;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  // Solo ejecutar consulta normal si no se usó el filtro especial
  if (!filters._specialFilter) {
    const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

    // Para logs del sistema, agregar información especial si el actor es null
    const logsWithSystemInfo = logs.map((log) => {
      if (!log.actor && log.actorId === '00000000-0000-0000-0000-000000000000') {
        return {
          ...log,
          actor: {
            id: log.actorId,
            name: 'Sistema',
            email: 'system@fidufi.mx',
            role: 'SYSTEM',
          },
        };
      }
      return log;
    });

    return {
      logs: logsWithSystemInfo,
      total,
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    };
  }

  // Si llegamos aquí, debería haber retornado antes con el filtro especial
  // Este código nunca debería ejecutarse, pero lo dejamos por seguridad
  return {
    logs: [],
    total: 0,
    limit: filters.limit || 100,
    offset: filters.offset || 0,
  };
}

/**
 * Obtiene logs de auditoría para una entidad específica
 * 
 * Nota: Los permisos se manejan en el endpoint, no aquí.
 * Esta función simplemente filtra por entityType y entityId.
 */
export async function getEntityAuditLogs(
  entityType: string,
  entityId: string,
  limit: number = 50
) {
  return getAuditLogs({
    entityType,
    entityId,
    limit,
  });
}

/**
 * Obtiene logs de auditoría para un fideicomiso
 */
export async function getTrustAuditLogs(
  trustId: string,
  limit: number = 100
) {
  return getAuditLogs({
    trustId,
    limit,
  });
}

/**
 * Obtiene logs de auditoría para un usuario
 */
export async function getUserAuditLogs(
  actorId: string,
  limit: number = 100
) {
  return getAuditLogs({
    actorId,
    limit,
  });
}

/**
 * Helper para extraer IP y User-Agent de una request de Express
 */
export function extractRequestInfo(req: any): {
  ipAddress?: string;
  userAgent?: string;
} {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || undefined,
    userAgent: req.headers['user-agent'] || undefined,
  };
}
