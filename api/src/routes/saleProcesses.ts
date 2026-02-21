/**
 * Routes para comercialización (SaleProcess, Reservation)
 * Iteración 6
 */

import { Router } from 'express';
import {
  createSaleProcess,
  getSaleProcessesByTrust,
  updateSaleProcessStatus,
  addReservation,
} from '../services/saleProcessService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

router.post('/', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, ...data } = req.body;
    if (!trustId || !req.user) return res.status(400).json({ error: 'trustId requerido' });
    const sale = await createSaleProcess(trustId, data, req.user.actorId);
    res.status(201).json(sale);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const status = req.query.status as string;
    const sales = await getSaleProcessesByTrust(trustId, {
      status,
      callerActorId: req.user?.actorId,
    });
    res.json(sales);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/:id/status', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const sale = await updateSaleProcessStatus(req.params.id, req.body.status, req.user.actorId, req.body.buyerActorId);
    res.json(sale);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/reservations', authenticate, async (req, res) => {
  try {
    const reservation = await addReservation(req.params.id, req.body);
    res.status(201).json(reservation);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
