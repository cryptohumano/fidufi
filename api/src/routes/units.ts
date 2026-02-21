/**
 * Routes para unidades funcionales
 * Iteración 5
 */

import { Router } from 'express';
import {
  createUnit,
  getUnitsByTrust,
  updateUnitStatus,
  allocateUnit,
  createSelectionRound,
  getSelectionRoundsByTrust,
  completeSelectionRound,
} from '../services/unitService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

router.post('/', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, ...data } = req.body;
    if (!trustId || !req.user) return res.status(400).json({ error: 'trustId requerido' });
    const unit = await createUnit(trustId, data, req.user.actorId);
    res.status(201).json(unit);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const status = req.query.status as any;
    const units = await getUnitsByTrust(trustId, { status });
    res.json(units);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/:id/status', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const unit = await updateUnitStatus(req.params.id, req.body.status, req.user.actorId);
    res.json(unit);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/allocate', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { actorId, roundId } = req.body;
    if (!actorId || !req.user) return res.status(400).json({ error: 'actorId (beneficiario) requerido' });
    const unit = await allocateUnit(req.params.id, actorId, roundId, req.user.actorId);
    res.json(unit);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/selection-rounds', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, ...data } = req.body;
    if (!trustId || !req.user) return res.status(400).json({ error: 'trustId requerido' });
    const round = await createSelectionRound(trustId, data, req.user.actorId);
    res.status(201).json(round);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/selection-rounds', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const rounds = await getSelectionRoundsByTrust(trustId);
    res.json(rounds);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/selection-rounds/:id/complete', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const round = await completeSelectionRound(req.params.id, req.body, req.user.actorId);
    res.json(round);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
