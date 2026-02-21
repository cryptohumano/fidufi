/**
 * Routes para hitos de obra (Milestones)
 * Iteración 3
 */

import { Router } from 'express';
import {
  createMilestone,
  getMilestonesByTrust,
  getMilestoneById,
  updateMilestone,
} from '../services/milestoneService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

router.post('/', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, ...data } = req.body;
    if (!trustId || !req.user) return res.status(400).json({ error: 'trustId requerido' });
    const milestone = await createMilestone(trustId, data, req.user.actorId);
    res.status(201).json(milestone);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const parentId = req.query.parentId as string | undefined;
    const milestones = await getMilestonesByTrust(trustId, {
      parentId: parentId === 'null' || parentId === '' ? null : parentId,
    });
    res.json(milestones);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const milestone = await getMilestoneById(req.params.id);
    res.json(milestone);
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});

router.patch('/:id', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const milestone = await updateMilestone(req.params.id, req.body, req.user.actorId);
    res.json(milestone);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
