/**
 * Routes para documentos de contrato y anexos
 */

import { Router } from 'express';
import {
  createContractDocument,
  getContractDocumentsByTrust,
  addContractAnnex,
} from '../services/contractDocumentService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

router.post('/', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const { trustId, ...data } = req.body;
    if (!trustId || !req.user) return res.status(400).json({ error: 'trustId requerido' });
    const doc = await createContractDocument(trustId, data, req.user.actorId);
    res.status(201).json(doc);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const trustId = req.query.trustId as string;
    if (!trustId) return res.status(400).json({ error: 'trustId requerido' });
    const docs = await getContractDocumentsByTrust(trustId);
    res.json(docs);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:documentId/annexes', authenticate, authorize(ActorRole.FIDUCIARIO, ActorRole.COMITE_TECNICO, ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const annex = await addContractAnnex(req.params.documentId, req.body);
    res.status(201).json(annex);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
