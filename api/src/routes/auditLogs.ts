/**
 * Routes para consultar logs de auditoría
 */

import { Router } from 'express';
import { getAuditLogs, getEntityAuditLogs, getTrustAuditLogs, getUserAuditLogs } from '../services/auditLogService';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

/**
 * GET /audit-logs
 * Lista logs de auditoría con filtros opcionales
 * 
 * Query params:
 * - actorId: Filtrar por usuario (opcional)
 * - action: Filtrar por tipo de acción (opcional)
 * - entityType: Filtrar por tipo de entidad (opcional)
 * - entityId: Filtrar por ID de entidad (opcional)
 * - trustId: Filtrar por fideicomiso (opcional)
 * - startDate: Fecha de inicio (ISO string, opcional)
 * - endDate: Fecha de fin (ISO string, opcional)
 * - limit: Límite de resultados (opcional, default: 100)
 * - offset: Offset para paginación (opcional, default: 0)
 * 
 * Permisos:
 * - SUPER_ADMIN: Ve todos los logs
 * - COMITE_TECNICO, FIDUCIARIO: Ven todos los logs de activos (entityType = 'Asset')
 *   y sus propios logs para otras entidades
 * - AUDITOR, REGULADOR: Ven logs de fideicomisos a los que tienen acceso
 * - Otros roles: Solo ven sus propios logs
 */
router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const {
      actorId,
      action,
      entityType,
      entityId,
      trustId,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    const userRole = req.user.actor?.role;
    const isSuperAdmin = req.user.actor?.isSuperAdmin || userRole === ActorRole.SUPER_ADMIN;
    const isComiteTecnico = userRole === ActorRole.COMITE_TECNICO;
    const isFiduciario = userRole === ActorRole.FIDUCIARIO;
    const isAuditorOrRegulador = userRole === ActorRole.AUDITOR || userRole === ActorRole.REGULADOR;

    // Determinar filtros según el rol del usuario
    const filters: any = {};

    // SUPER_ADMIN puede ver todos los logs
    if (isSuperAdmin) {
      // Aplicar filtros si se proporcionan
      if (actorId) filters.actorId = actorId as string;
      if (action) filters.action = action as string;
      if (entityType) filters.entityType = entityType as string;
      if (entityId) filters.entityId = entityId as string;
      if (trustId) filters.trustId = trustId as string;
    } else if (isComiteTecnico || isFiduciario) {
      // COMITE_TECNICO y FIDUCIARIO pueden ver:
      // 1. Todos los logs de activos (entityType = 'Asset')
      // 2. Sus propios logs para otras entidades
      
      const requestedEntityType = entityType as string | undefined;
      
      if (requestedEntityType === 'Asset') {
        // Si están consultando específicamente logs de activos, mostrar todos los logs de activos
        filters.entityType = 'Asset';
        if (action) filters.action = action as string;
        if (entityId) filters.entityId = entityId as string;
        if (trustId) filters.trustId = trustId as string;
        // No filtrar por actorId - pueden ver todos los logs de activos
      } else if (requestedEntityType) {
        // Para otras entidades específicas, solo sus propios logs
        filters.actorId = req.user.actorId;
        filters.entityType = requestedEntityType;
        if (action) filters.action = action as string;
        if (entityId) filters.entityId = entityId as string;
        if (trustId) filters.trustId = trustId as string;
      } else {
        // Si no se especifica entityType, mostrar:
        // - Todos los logs de activos (entityType = 'Asset')
        // - Sus propios logs para otras entidades
        // Usamos un filtro especial que se manejará en getAuditLogs
        filters._specialFilter = 'comiteOrFiduciarioAll';
        filters._actorId = req.user.actorId;
        if (action) filters.action = action as string;
        if (entityId) filters.entityId = entityId as string;
        if (trustId) filters.trustId = trustId as string;
      }
    } else if (isAuditorOrRegulador) {
      // AUDITOR y REGULADOR ven logs de fideicomisos a los que tienen acceso
      if (trustId) {
        filters.trustId = trustId as string;
      } else {
        // Si no se especifica trustId, solo mostrar logs del usuario actual
        filters.actorId = req.user.actorId;
      }
      if (action) filters.action = action as string;
      if (entityType) filters.entityType = entityType as string;
      if (entityId) filters.entityId = entityId as string;
    } else {
      // Otros roles solo ven sus propios logs
      filters.actorId = req.user.actorId;
      if (action) filters.action = action as string;
      if (entityType) filters.entityType = entityType as string;
      if (entityId) filters.entityId = entityId as string;
      if (trustId) filters.trustId = trustId as string;
    }

    // Filtros de fecha
    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }
    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    // Paginación
    if (limit) {
      filters.limit = parseInt(limit as string);
    }
    if (offset) {
      filters.offset = parseInt(offset as string);
    }

    const result = await getAuditLogs(filters);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /audit-logs/entity/:entityType/:entityId
 * Obtiene logs de auditoría para una entidad específica
 * 
 * Permisos:
 * - SUPER_ADMIN: Ve todos los logs de cualquier entidad
 * - COMITE_TECNICO, FIDUCIARIO: Ven todos los logs si la entidad es un activo (Asset)
 *   Para otras entidades, ven solo sus propios logs de esa entidad
 * - Otros roles: Ven todos los logs de la entidad (la validación de acceso se hace a nivel de entidad)
 */
router.get('/entity/:entityType/:entityId', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { entityType, entityId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const userRole = req.user.actor?.role;
    const isSuperAdmin = req.user.actor?.isSuperAdmin || userRole === ActorRole.SUPER_ADMIN;
    const isComiteTecnico = userRole === ActorRole.COMITE_TECNICO;
    const isFiduciario = userRole === ActorRole.FIDUCIARIO;

    // Construir filtros según permisos
    const filters: any = {
      entityType,
      entityId,
      limit,
    };

    // SUPER_ADMIN ve todos los logs
    if (!isSuperAdmin) {
      // COMITE_TECNICO y FIDUCIARIO ven todos los logs de activos
      // Para otras entidades, solo sus propios logs
      if ((isComiteTecnico || isFiduciario) && entityType === 'Asset') {
        // No filtrar por actorId - pueden ver todos los logs del activo
      } else {
        // Para otras entidades o roles, solo sus propios logs
        filters.actorId = req.user.actorId;
      }
    }

    const result = await getAuditLogs(filters);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /audit-logs/trust/:trustId
 * Obtiene logs de auditoría para un fideicomiso
 */
router.get('/trust/:trustId', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { trustId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    // Verificar acceso al fideicomiso (excepto SUPER_ADMIN)
    if (!req.user.actor?.isSuperAdmin && req.user.actor?.role !== ActorRole.SUPER_ADMIN) {
      // En el futuro, verificar que el usuario tiene acceso a este fideicomiso
      // Por ahora, permitir acceso
    }

    const result = await getTrustAuditLogs(trustId, limit);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /audit-logs/user/:actorId
 * Obtiene logs de auditoría para un usuario específico
 * Solo SUPER_ADMIN puede ver logs de otros usuarios
 */
router.get('/user/:actorId', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { actorId } = req.params;

    // Solo SUPER_ADMIN puede ver logs de otros usuarios
    if (actorId !== req.user.actorId) {
      if (!req.user.actor?.isSuperAdmin && req.user.actor?.role !== ActorRole.SUPER_ADMIN) {
        return res.status(403).json({ error: 'Solo puedes ver tus propios logs' });
      }
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const result = await getUserAuditLogs(actorId, limit);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
