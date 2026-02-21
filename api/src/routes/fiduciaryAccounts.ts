/**
 * Routes para cuentas fiduciarias y movimientos bancarios
 */

import { Router } from 'express';
import {
  createFiduciaryAccount,
  getFiduciaryAccountsByTrust,
  createBankMovement,
} from '../services/fiduciaryAccountService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

router.post('/', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, ...data } = req.body;
    if (!trustId || !req.user) return res.status(400).json({ error: 'trustId requerido' });
    const account = await createFiduciaryAccount(trustId, data, req.user.actorId);
    res.status(201).json(account);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const accounts = await getFiduciaryAccountsByTrust(trustId);
    res.json(accounts);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:accountId/movements', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const movement = await createBankMovement(req.params.accountId, req.body, req.user.actorId);
    res.status(201).json(movement);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
