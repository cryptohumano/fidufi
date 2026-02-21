/**
 * Routes para policy engine (ApprovalPolicy, ApprovalRequest)
 * Iteración 4
 */

import { Router } from 'express';
import {
  getPolicy,
  listPoliciesByTrust,
  upsertPolicy,
  createApprovalRequest,
  getApprovalRequestsByTrust,
  addApprovalVote,
} from '../services/approvalPolicyService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

router.get('/policies', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const policies = await listPoliciesByTrust(trustId);
    res.json(policies);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/policies/:actionType', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const policy = await getPolicy(trustId, req.params.actionType);
    res.json(policy ?? null);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/policies/:actionType', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const trustId = req.body.trustId as string;
    if (!trustId || !req.user) return res.status(400).json({ error: 'trustId requerido' });
    const policy = await upsertPolicy(trustId, req.params.actionType, req.body, req.user.actorId);
    res.json(policy);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/requests', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, actionType, entityType, entityId } = req.body;
    if (!trustId || !actionType || !entityType || !entityId || !req.user) {
      return res.status(400).json({ error: 'trustId, actionType, entityType, entityId requeridos' });
    }
    const request = await createApprovalRequest(trustId, { actionType, entityType, entityId }, req.user.actorId);
    res.status(201).json(request);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/requests', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const status = req.query.status as string | undefined;
    const requests = await getApprovalRequestsByTrust(trustId, { status });
    res.json(requests);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/requests/:id/vote', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { vote, reason } = req.body;
    if (!req.user || (vote !== 'APPROVE' && vote !== 'REJECT')) {
      return res.status(400).json({ error: 'vote debe ser APPROVE o REJECT' });
    }
    const request = await addApprovalVote(req.params.id, req.user.actorId, vote, reason);
    res.json(request);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
