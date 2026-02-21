/**
 * Rutas para glosario de conceptos por fideicomiso (Iteración 9)
 */

import { Router } from 'express';
import {
  getConceptsByTrust,
  getConceptByKey,
  upsertConcept,
  deleteConcept,
} from '../services/trustConceptService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const list = await getConceptsByTrust(trustId);
    res.json(list);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:trustId/:conceptKey', authenticate, async (req, res) => {
  try {
    const { trustId, conceptKey } = req.params;
    const c = await getConceptByKey(trustId, decodeURIComponent(conceptKey));
    if (!c) return res.status(404).json({ error: 'Concepto no encontrado' });
    res.json(c);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, conceptKey, displayName, description } = req.body;
    if (!trustId || !conceptKey || !displayName || !req.user)
      return res.status(400).json({ error: 'trustId, conceptKey y displayName requeridos' });
    const out = await upsertConcept(trustId, { conceptKey, displayName, description }, req.user.actorId);
    res.json(out);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:trustId/:conceptKey', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, conceptKey } = req.params;
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    await deleteConcept(trustId, decodeURIComponent(conceptKey), req.user.actorId);
    res.json({ deleted: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
