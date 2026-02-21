/**
 * Routes para aportes (contributions)
 */

import { Router } from 'express';
import {
  createContribution,
  getContributionsByTrust,
  getContributionById,
  updateContribution,
  markContributionPaid,
  recordIntimacionSent,
} from '../services/contributionService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';
import { extractRequestInfo } from '../services/auditLogService';

const router = Router();

router.post('/', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const contribution = await createContribution({
      ...req.body,
      createdBy: req.user.actorId,
      requestInfo: extractRequestInfo(req),
    });
    res.status(201).json(contribution);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { trustId, status, contributorId, limit, offset } = req.query;
    if (!trustId) return res.status(400).json({ error: 'trustId es requerido' });
    const result = await getContributionsByTrust(trustId as string, {
      status: status as any,
      contributorId: contributorId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const contribution = await getContributionById(req.params.id);
    res.json(contribution);
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});

router.patch('/:id', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const contribution = await updateContribution(
      req.params.id,
      req.body,
      req.user.actorId,
      extractRequestInfo(req)
    );
    res.json(contribution);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/mark-paid', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const contribution = await markContributionPaid(req.params.id, req.user.actorId, extractRequestInfo(req));
    res.json(contribution);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/record-intimacion', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const contribution = await recordIntimacionSent(
      req.params.id,
      req.user.actorId,
      req.body,
      extractRequestInfo(req)
    );
    res.json(contribution);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
