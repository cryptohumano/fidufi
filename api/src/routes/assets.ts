/**
 * Routes para gestión de activos
 */

import { Router } from 'express';
import { registerAsset, getAssets, getAssetById, approveException, rejectException } from '../services/assetService';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

/**
 * POST /assets/register
 * Registra un nuevo activo con validación completa de reglas
 * Requiere autenticación como FIDUCIARIO o COMITE_TECNICO
 */
router.post('/register', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const result = await registerAsset({
      ...req.body,
      registeredBy: req.user.actorId,
      // Pasar información de la request para logging
      requestInfo: {
        ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0],
        userAgent: req.headers['user-agent'],
      },
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /assets
 * Lista activos con filtros opcionales
 * 
 * Query params:
 * - trustId (requerido): ID del fideicomiso
 * - assetType: Tipo de activo (opcional)
 * - complianceStatus: Estado de cumplimiento (opcional)
 * - limit: Límite de resultados (opcional)
 * - offset: Offset para paginación (opcional)
 * - beneficiaryId: Filtrar por beneficiario específico (opcional)
 * 
 * FILTRADO AUTOMÁTICO POR ROL:
 * - Si el usuario es BENEFICIARIO: automáticamente filtra solo sus activos (beneficiaryId = su ID)
 * - Otros roles: ven todos los activos del fideicomiso
 * 
 * El parámetro beneficiaryId puede sobrescribir el filtro automático si se especifica explícitamente.
 */
router.get('/', optionalAuthenticate, async (req, res) => {
  try {
    const { trustId, assetType, complianceStatus, limit, offset, beneficiaryId } = req.query;

    if (!trustId) {
      return res.status(400).json({ error: 'trustId es requerido' });
    }

    // Obtener información del usuario autenticado (si existe)
    const actorRole = req.user?.role;
    const actorId = req.user?.actorId;

    const result = await getAssets({
      trustId: trustId as string,
      assetType: assetType as any,
      complianceStatus: complianceStatus as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      beneficiaryId: beneficiaryId as string || undefined,
      actorRole: actorRole as any,
      actorId: actorId || undefined,
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /assets/:id
 * Obtiene un activo específico por ID
 * 
 * VALIDACIÓN DE ACCESO:
 * - BENEFICIARIO: Solo puede ver activos donde beneficiaryId = su ID
 * - Otros roles: Pueden ver cualquier activo del fideicomiso donde pertenecen
 * 
 * Si un beneficiario intenta acceder a un activo no asociado a él, se retorna error 404.
 */
router.get('/:id', optionalAuthenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await getAssetById(
      id,
      req.user?.actorId,
      req.user?.role as any
    );
    res.json(asset);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /assets/:id/compliance
 * Obtiene detalles de cumplimiento de un activo
 */
router.get('/:id/compliance', async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await getAssetById(id);
    
    res.json({
      assetId: asset.id,
      compliant: asset.compliant,
      complianceStatus: asset.complianceStatus,
      validationResults: asset.validationResults,
      alerts: asset.alerts,
    });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * PUT /assets/:id/approve-exception
 * Aprueba una excepción para un activo pendiente de revisión
 * Solo el Comité Técnico puede aprobar excepciones
 * 
 * Body: { reason?: string }
 */
router.put('/:id/approve-exception', authenticate, authorize(ActorRole.COMITE_TECNICO), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const { id } = req.params;
    const { reason } = req.body;
    
    // Pasar información de la request para logging
    const result = await approveException(
      id,
      req.user.actorId,
      reason,
      {
        ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0],
        userAgent: req.headers['user-agent'],
      }
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /assets/:id/reject-exception
 * Rechaza una excepción para un activo pendiente de revisión
 * Solo el Comité Técnico puede rechazar excepciones
 * 
 * Body: { reason?: string }
 */
router.put('/:id/reject-exception', authenticate, authorize(ActorRole.COMITE_TECNICO), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const { id } = req.params;
    const { reason } = req.body;
    
    // Pasar información de la request para logging
    const result = await rejectException(
      id,
      req.user.actorId,
      reason,
      {
        ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0],
        userAgent: req.headers['user-agent'],
      }
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
