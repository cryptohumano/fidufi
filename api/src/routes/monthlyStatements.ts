/**
 * Routes para gestión de estados de cuenta mensuales
 */

import { Router } from 'express';
import {
  createStatement,
  getStatementById,
  listStatements,
  reviewStatement,
  generatePreviousMonthStatement,
  processTacitApprovals,
} from '../services/monthlyStatementService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';
import { extractRequestInfo } from '../services/auditLogService';

const router = Router();

/**
 * POST /api/monthly-statements
 * Crea un nuevo estado de cuenta mensual
 * Requiere: FIDUCIARIO
 */
router.post('/', authenticate, authorize(ActorRole.FIDUCIARIO), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { trustId, year, month, summary, assets, transactions, documentUrl, documentHash } = req.body;

    if (!trustId || !year || !month) {
      return res.status(400).json({ error: 'trustId, year y month son requeridos' });
    }

    const requestInfo = extractRequestInfo(req);
    const statement = await createStatement({
      trustId,
      year: parseInt(year),
      month: parseInt(month),
      submittedBy: req.user.actorId,
      summary,
      assets,
      transactions,
      documentUrl,
      documentHash,
      requestInfo,
    });

    res.status(201).json(statement);
  } catch (error: any) {
    console.error('Error creando estado de cuenta:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/monthly-statements/:id
 * Obtiene un estado de cuenta por ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const statement = await getStatementById(req.params.id);
    res.json(statement);
  } catch (error: any) {
    console.error('Error obteniendo estado de cuenta:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/monthly-statements
 * Lista estados de cuenta de un fideicomiso con filtros opcionales
 * Query params: trustId (requerido), year, month, status, limit, offset
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { trustId, year, month, status, limit, offset } = req.query;

    if (!trustId) {
      return res.status(400).json({ error: 'trustId es requerido' });
    }

    const statements = await listStatements({
      trustId: trustId as string,
      year: year ? parseInt(year as string) : undefined,
      month: month ? parseInt(month as string) : undefined,
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(statements);
  } catch (error: any) {
    console.error('Error listando estados de cuenta:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/monthly-statements/:id/review
 * Revisa y aprueba/observa un estado de cuenta
 * Requiere: COMITE_TECNICO
 */
router.put('/:id/review', authenticate, authorize(ActorRole.COMITE_TECNICO), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { status, observations } = req.body;

    if (!status || (status !== 'APPROVED' && status !== 'OBSERVED')) {
      return res.status(400).json({ error: 'status debe ser APPROVED u OBSERVED' });
    }

    const requestInfo = extractRequestInfo(req);
    const updatedStatement = await reviewStatement(
      req.params.id,
      {
        status,
        observations,
      },
      req.user.actorId,
      requestInfo
    );

    res.json(updatedStatement);
  } catch (error: any) {
    console.error('Error revisando estado de cuenta:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/monthly-statements/trust/:trustId/generate-previous
 * Genera automáticamente el estado de cuenta del mes anterior
 * Requiere: FIDUCIARIO
 */
router.post('/trust/:trustId/generate-previous', authenticate, authorize(ActorRole.FIDUCIARIO), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const statement = await generatePreviousMonthStatement(req.params.trustId, req.user.actorId);
    res.json({ statement, message: 'Estado de cuenta generado automáticamente' });
  } catch (error: any) {
    console.error('Error generando estado de cuenta:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/monthly-statements/process-tacit-approvals
 * Procesa auto-aprobaciones tácitas para estados pendientes
 * Requiere: SUPER_ADMIN o puede ser ejecutado por un cron job
 */
router.post('/process-tacit-approvals', authenticate, authorize(ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    const approvedCount = await processTacitApprovals();
    res.json({ 
      message: `Procesadas ${approvedCount} auto-aprobaciones tácitas`,
      approvedCount,
    });
  } catch (error: any) {
    console.error('Error procesando auto-aprobaciones:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
