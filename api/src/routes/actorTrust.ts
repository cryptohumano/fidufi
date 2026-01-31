/**
 * Routes para gestión de pertenencia de actores a fideicomisos
 */

import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import {
  assignActorToTrust,
  revokeActorFromTrust,
  getActorTrusts,
  getTrustActors,
} from '../services/actorTrustService';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * POST /actor-trust
 * Asigna un actor a un fideicomiso (solo Super Admin)
 */
router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { actorId, trustId, roleInTrust } = req.body;

    if (!actorId || !trustId || !roleInTrust) {
      return res.status(400).json({ error: 'actorId, trustId y roleInTrust son requeridos' });
    }

    const { extractRequestInfo } = await import('../services/auditLogService');
    const requestInfo = extractRequestInfo(req);

    const membership = await assignActorToTrust(
      {
        actorId,
        trustId,
        roleInTrust,
      },
      req.user.actorId,
      requestInfo
    );

    res.status(201).json(membership);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /actor-trust/:actorId/:trustId
 * Revoca el acceso de un actor a un fideicomiso (solo Super Admin)
 */
router.delete('/:actorId/:trustId', requireSuperAdmin, async (req, res) => {
  try {
    const { actorId, trustId } = req.params;

    await revokeActorFromTrust(actorId, trustId);

    res.json({ message: 'Acceso revocado exitosamente' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /actor-trust/actor/:actorId
 * Obtiene todos los fideicomisos a los que pertenece un actor
 */
router.get('/actor/:actorId', async (req, res) => {
  try {
    const { actorId } = req.params;

    // Solo puede ver sus propios fideicomisos o ser Super Admin
    if (req.user?.actorId !== actorId && !req.user?.isSuperAdmin) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const memberships = await getActorTrusts(actorId);
    res.json(memberships);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /actor-trust/trust/:trustId
 * Obtiene todos los actores asignados a un fideicomiso
 */
router.get('/trust/:trustId', async (req, res) => {
  try {
    const { trustId } = req.params;
    const { role } = req.query;

    // Verificar que el usuario tiene acceso al fideicomiso o es Super Admin
    if (!req.user?.isSuperAdmin) {
      const { verifyActorTrustMembership } = await import('../services/actorTrustService');
      const hasAccess = await verifyActorTrustMembership(
        req.user!.actorId,
        trustId
      );
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes acceso a este fideicomiso' });
      }
    }

    const actors = await getTrustActors(
      trustId,
      role ? (role as any) : undefined
    );
    res.json(actors);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
