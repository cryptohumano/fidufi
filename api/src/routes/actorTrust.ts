/**
 * Routes para gestión de pertenencia de actores a fideicomisos
 */

import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';
import {
  assignActorToTrust,
  revokeActorFromTrust,
  getActorTrusts,
  getTrustActors,
} from '../services/actorTrustService';
import { getTrust } from '../services/trustService';

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
    const isSuperAdmin = req.user?.actor?.isSuperAdmin || req.user?.role === ActorRole.SUPER_ADMIN;
    if (req.user?.actorId !== actorId && !isSuperAdmin) {
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
  // #region agent log
  const _log = (msg: string, data: Record<string, unknown>) => {
    fetch('http://localhost:7242/ingest/5d4ace75-5167-468d-a08d-1792e7aa6769', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: 'actorTrust.ts:GET/trust/:trustId', message: msg, data, timestamp: Date.now(), hypothesisId: 'H1', runId: 'getTrustActors' }),
    }).catch(() => {});
  };
  // #endregion
  try {
    const { trustId } = req.params;
    const { role } = req.query;
    // #region agent log
    _log('entry', { trustId });
    // #endregion

    // Asegurar que el fideicomiso existe; si no, 404 en lugar de 400
    try {
      await getTrust(trustId);
    } catch (err: any) {
      if (err?.message?.includes('no encontrado')) {
        // #region agent log
        _log('trust not found, returning 404', { trustId, errorMessage: err?.message });
        // #endregion
        return res.status(404).json({ error: err.message });
      }
      throw err;
    }

    // Verificar que el usuario tiene acceso al fideicomiso o es Super Admin
    const isSuperAdmin = req.user?.actor?.isSuperAdmin || req.user?.role === ActorRole.SUPER_ADMIN;
    if (!isSuperAdmin) {
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
    // #region agent log
    _log('success', { trustId, actorCount: actors?.length ?? 0 });
    // #endregion
    res.json(actors);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
