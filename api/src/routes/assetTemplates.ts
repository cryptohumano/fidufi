/**
 * Routes para plantillas de activos
 */

import { Router } from 'express';
import {
  createAssetTemplate,
  getAssetTemplateById,
  listAssetTemplates,
  getDefaultTemplate,
  updateAssetTemplate,
  deleteAssetTemplate,
} from '../services/assetTemplateService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';
import { extractRequestInfo } from '../services/auditLogService';
import { createAuditLog, AuditAction, EntityType } from '../services/auditLogService';

const router = Router();

/**
 * GET /api/asset-templates
 * Lista plantillas con filtros opcionales
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { assetType, trustId, isActive, isDefault } = req.query;

    const filters: any = {};
    if (assetType) filters.assetType = assetType;
    if (trustId !== undefined) {
      // Si trustId es "null" (string), convertir a null
      filters.trustId = trustId === 'null' ? null : trustId;
    }
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isDefault !== undefined) filters.isDefault = isDefault === 'true';

    const templates = await listAssetTemplates(filters);
    res.json(templates);
  } catch (error: any) {
    console.error('Error listando plantillas:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/asset-templates/default/:assetType
 * Obtiene la plantilla por defecto para un tipo de activo
 */
router.get('/default/:assetType', authenticate, async (req, res) => {
  try {
    const { assetType } = req.params;
    const { trustId } = req.query;

    const template = await getDefaultTemplate(assetType as any, trustId as string);
    res.json(template);
  } catch (error: any) {
    console.error('Error obteniendo plantilla por defecto:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/asset-templates/:id
 * Obtiene una plantilla por ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const template = await getAssetTemplateById(id);
    res.json(template);
  } catch (error: any) {
    console.error('Error obteniendo plantilla:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/asset-templates
 * Crea una nueva plantilla
 * Requiere: FIDUCIARIO o SUPER_ADMIN
 */
router.post('/', authenticate, authorize([ActorRole.FIDUCIARIO, ActorRole.SUPER_ADMIN]), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { assetType, trustId, name, description, defaultFields, isDefault } = req.body;

    if (!assetType || !name || !defaultFields) {
      return res.status(400).json({ error: 'assetType, name y defaultFields son requeridos' });
    }

    const template = await createAssetTemplate({
      assetType,
      trustId: trustId || null,
      name,
      description,
      defaultFields,
      isDefault: isDefault || false,
      createdBy: req.user.actorId,
    });

    // Registrar log de auditoría
    const requestInfo = extractRequestInfo(req);
    try {
      await createAuditLog({
        actorId: req.user.actorId,
        action: AuditAction.ASSET_TEMPLATE_CREATED,
        entityType: EntityType.ASSET,
        entityId: template.id,
        trustId: template.trustId || undefined,
        description: `Plantilla "${name}" creada para tipo de activo ${assetType}`,
        metadata: {
          templateId: template.id,
          assetType,
          trustId: template.trustId,
          isDefault: template.isDefault,
        },
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
      });
    } catch (error) {
      console.error('⚠️  Error registrando log de auditoría:', error);
    }

    res.json(template);
  } catch (error: any) {
    console.error('Error creando plantilla:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/asset-templates/:id
 * Actualiza una plantilla
 * Requiere: FIDUCIARIO o SUPER_ADMIN
 */
router.put('/:id', authenticate, authorize([ActorRole.FIDUCIARIO, ActorRole.SUPER_ADMIN]), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;
    const { name, description, defaultFields, isDefault, isActive } = req.body;

    const template = await updateAssetTemplate(id, {
      name,
      description,
      defaultFields,
      isDefault,
      isActive,
    });

    // Registrar log de auditoría
    const requestInfo = extractRequestInfo(req);
    try {
      await createAuditLog({
        actorId: req.user.actorId,
        action: AuditAction.ASSET_TEMPLATE_UPDATED,
        entityType: EntityType.ASSET,
        entityId: template.id,
        trustId: template.trustId || undefined,
        description: `Plantilla "${template.name}" actualizada`,
        metadata: {
          templateId: template.id,
          assetType: template.assetType,
        },
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
      });
    } catch (error) {
      console.error('⚠️  Error registrando log de auditoría:', error);
    }

    res.json(template);
  } catch (error: any) {
    console.error('Error actualizando plantilla:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/asset-templates/:id
 * Elimina una plantilla (soft delete)
 * Requiere: FIDUCIARIO o SUPER_ADMIN
 */
router.delete('/:id', authenticate, authorize([ActorRole.FIDUCIARIO, ActorRole.SUPER_ADMIN]), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;
    const template = await getAssetTemplateById(id);

    await deleteAssetTemplate(id);

    // Registrar log de auditoría
    const requestInfo = extractRequestInfo(req);
    try {
      await createAuditLog({
        actorId: req.user.actorId,
        action: AuditAction.ASSET_TEMPLATE_DELETED,
        entityType: EntityType.ASSET,
        entityId: template.id,
        trustId: template.trustId || undefined,
        description: `Plantilla "${template.name}" eliminada`,
        metadata: {
          templateId: template.id,
          assetType: template.assetType,
        },
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
      });
    } catch (error) {
      console.error('⚠️  Error registrando log de auditoría:', error);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error eliminando plantilla:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
