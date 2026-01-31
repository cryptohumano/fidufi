/**
 * Routes para gestión de alertas
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { generateAllAlerts, generateAlertsForAllTrusts } from '../services/alertGenerationService';

const router = Router();

/**
 * GET /alerts
 * Lista alertas del actor actual
 * Query params: acknowledged, limit, offset
 * Si está autenticado, usa el actorId del JWT; si no, requiere actorId en query
 */
router.get('/', optionalAuthenticate, async (req, res) => {
  try {
    // Obtener actorId del JWT si está autenticado, o del query param
    const actorId = req.user?.actorId || (req.query.actorId as string);

    if (!actorId) {
      return res.status(400).json({ error: 'actorId es requerido (autenticación o query param)' });
    }
    
    const { acknowledged, limit, offset, alertType, alertSubtype, severity } = req.query;

    const where: any = {
      actorId: actorId as string,
    };

    if (acknowledged !== undefined) {
      where.acknowledged = acknowledged === 'true';
    }

    if (alertType) {
      where.alertType = alertType as string;
    }

    if (alertSubtype) {
      where.alertSubtype = alertSubtype as string;
    }

    if (severity) {
      where.severity = severity as string;
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          asset: {
            select: {
              id: true,
              trustId: true,
              assetType: true,
              valueMxn: true,
              complianceStatus: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit as string) : 100,
        skip: offset ? parseInt(offset as string) : 0,
      }),
      prisma.alert.count({ where }),
    ]);

    res.json({
      alerts,
      total,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /alerts/:id/acknowledge
 * Marca una alerta como leída
 * Requiere autenticación
 */
router.put('/:id/acknowledge', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const { id } = req.params;
    
    // Verificar que la alerta pertenece al actor autenticado
    const alert = await prisma.alert.findUnique({
      where: { id },
    });
    
    if (!alert) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }
    
    if (alert.actorId !== req.user.actorId) {
      return res.status(403).json({ error: 'No autorizado para esta alerta' });
    }
    
    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
      },
    });

    res.json(updatedAlert);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * POST /alerts/generate
 * Genera alertas avanzadas para un fideicomiso o todos los fideicomisos
 * Requiere autenticación (FIDUCIARIO, COMITE_TECNICO, o SUPER_ADMIN)
 * 
 * Body: { trustId?: string }
 * - Si se proporciona trustId: genera alertas solo para ese fideicomiso
 * - Si no se proporciona: genera alertas para todos los fideicomisos activos
 */
router.post('/generate', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { trustId } = req.body;

    if (trustId) {
      const results = await generateAllAlerts(trustId);
      res.json({
        trustId,
        ...results,
      });
    } else {
      const results = await generateAlertsForAllTrusts();
      res.json({
        results,
        totalTrusts: Object.keys(results).length,
      });
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
