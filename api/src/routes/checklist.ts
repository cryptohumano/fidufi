/**
 * Routes para checklist de cumplimiento (Iteración 8)
 */

import { Router } from 'express';
import { createChecklistItem, getChecklistByTrust, toggleChecklistItem } from '../services/checklistService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

router.post('/', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, ...data } = req.body;
    if (!trustId || !req.user) return res.status(400).json({ error: 'trustId requerido' });
    const item = await createChecklistItem(trustId, data, req.user.actorId);
    res.status(201).json(item);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const items = await getChecklistByTrust(trustId);
    res.json(items);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/:id/toggle', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const item = await toggleChecklistItem(req.params.id, req.body.completed === true, req.user.actorId);
    res.json(item);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
