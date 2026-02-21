/**
 * Routes para pólizas de seguro
 */

import { Router } from 'express';
import {
  createInsurancePolicy,
  getInsurancePoliciesByTrust,
  updateInsurancePolicy,
} from '../services/insurancePolicyService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

router.post('/', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, ...data } = req.body;
    if (!trustId || !req.user) return res.status(400).json({ error: 'trustId requerido' });
    const policy = await createInsurancePolicy(trustId, data, req.user.actorId);
    res.status(201).json(policy);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const policies = await getInsurancePoliciesByTrust(trustId);
    res.json(policies);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/:id', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const policy = await updateInsurancePolicy(req.params.id, req.body, req.user.actorId);
    res.json(policy);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
