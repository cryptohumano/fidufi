/**
 * Routes para votaciones de excepciones del Comité Técnico
 */

import { Router } from 'express';
import { voteException, getVotingStatus } from '../services/exceptionVoteService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';
import { extractRequestInfo } from '../services/auditLogService';

const router = Router();

/**
 * POST /api/exception-votes
 * Registra un voto de un miembro del Comité Técnico para una excepción
 * Requiere: COMITE_TECNICO
 */
router.post('/', authenticate, authorize(ActorRole.COMITE_TECNICO), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { assetId, vote, reason } = req.body;

    if (!assetId || !vote) {
      return res.status(400).json({ error: 'assetId y vote son requeridos' });
    }

    if (vote !== 'APPROVE' && vote !== 'REJECT') {
      return res.status(400).json({ error: 'vote debe ser APPROVE o REJECT' });
    }

    const requestInfo = extractRequestInfo(req);
    const result = await voteException({
      assetId,
      voterId: req.user.actorId,
      vote,
      reason,
      requestInfo,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error registrando voto:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/exception-votes/asset/:assetId
 * Obtiene el estado de votación de una excepción
 */
router.get('/asset/:assetId', authenticate, async (req, res) => {
  try {
    const { assetId } = req.params;
    const status = await getVotingStatus(assetId);
    res.json(status);
  } catch (error: any) {
    console.error('Error obteniendo estado de votación:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
