/**
 * Routes para gastos y documentos soporte
 */

import { Router } from 'express';
import {
  createExpense,
  getExpensesByTrust,
  markExpensePaid,
  addSupportingDocument,
} from '../services/expenseService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

router.post('/', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, ...data } = req.body;
    if (!trustId || !req.user) return res.status(400).json({ error: 'trustId requerido' });
    const expense = await createExpense(trustId, data, req.user.actorId);
    res.status(201).json(expense);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const expenses = await getExpensesByTrust(trustId, {
      budgetItemId: req.query.budgetItemId as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });
    res.json(expenses);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/mark-paid', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const expense = await markExpensePaid(req.params.id, req.user.actorId, req.body.fiduciaryAccountId);
    res.json(expense);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/documents', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const doc = await addSupportingDocument(req.params.id, req.body);
    res.status(201).json(doc);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
