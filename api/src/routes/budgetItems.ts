/**
 * Routes para rubros de presupuesto y planes de flujo de fondos
 */

import { Router } from 'express';
import {
  createBudgetItem,
  getBudgetItemsByTrust,
  createCashflowPlan,
  getCashflowPlansByTrust,
} from '../services/budgetService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

router.post('/', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, ...data } = req.body;
    if (!trustId || !req.user) return res.status(400).json({ error: 'trustId requerido' });
    const item = await createBudgetItem(trustId, data, req.user.actorId);
    res.status(201).json(item);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const items = await getBudgetItemsByTrust(trustId);
    res.json(items);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/cashflow-plans', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, ...data } = req.body;
    if (!trustId || !req.user) return res.status(400).json({ error: 'trustId requerido' });
    const plan = await createCashflowPlan(trustId, data, req.user.actorId);
    res.status(201).json(plan);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/cashflow-plans', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const plans = await getCashflowPlansByTrust(trustId);
    res.json(plans);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
