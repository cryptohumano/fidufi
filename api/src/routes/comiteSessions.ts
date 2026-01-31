/**
 * Routes para gestión de sesiones del Comité Técnico
 */

import { Router } from 'express';
import {
  createSession,
  getSessionById,
  listSessions,
  updateSession,
  calculateNextQuarterlyMeeting,
  generateQuarterlySessions,
} from '../services/comiteSessionService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';
import { extractRequestInfo } from '../services/auditLogService';

const router = Router();

/**
 * POST /api/comite-sessions
 * Crea una nueva sesión del Comité Técnico
 * Requiere: COMITE_TECNICO o FIDUCIARIO
 */
router.post('/', authenticate, authorize([ActorRole.COMITE_TECNICO, ActorRole.FIDUCIARIO]), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { trustId, sessionDate, sessionType, location, meetingLink, agenda } = req.body;

    if (!trustId || !sessionDate || !sessionType) {
      return res.status(400).json({ error: 'trustId, sessionDate y sessionType son requeridos' });
    }

    const requestInfo = extractRequestInfo(req);
    const session = await createSession({
      trustId,
      sessionDate,
      sessionType,
      scheduledBy: req.user.actorId,
      location,
      meetingLink,
      agenda,
      requestInfo,
    });

    res.status(201).json(session);
  } catch (error: any) {
    console.error('Error creando sesión:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/comite-sessions/:id
 * Obtiene una sesión por ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const session = await getSessionById(req.params.id);
    res.json(session);
  } catch (error: any) {
    console.error('Error obteniendo sesión:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/comite-sessions
 * Lista sesiones de un fideicomiso con filtros opcionales
 * Query params: trustId (requerido), status, sessionType, startDate, endDate, limit, offset
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { trustId, status, sessionType, startDate, endDate, limit, offset } = req.query;

    if (!trustId) {
      return res.status(400).json({ error: 'trustId es requerido' });
    }

    const sessions = await listSessions({
      trustId: trustId as string,
      status: status as string | undefined,
      sessionType: sessionType as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(sessions);
  } catch (error: any) {
    console.error('Error listando sesiones:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/comite-sessions/:id
 * Actualiza una sesión existente
 * Requiere: COMITE_TECNICO o FIDUCIARIO
 */
router.put('/:id', authenticate, authorize([ActorRole.COMITE_TECNICO, ActorRole.FIDUCIARIO]), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { sessionDate, sessionType, attendees, quorum, agenda, decisions, approvedItems, minutes, minutesUrl, minutesHash, status, location, meetingLink } = req.body;

    const requestInfo = extractRequestInfo(req);
    const updatedSession = await updateSession(
      req.params.id,
      {
        sessionDate,
        sessionType,
        attendees,
        quorum,
        agenda,
        decisions,
        approvedItems,
        minutes,
        minutesUrl,
        minutesHash,
        status,
        location,
        meetingLink,
      },
      req.user.actorId,
      requestInfo
    );

    res.json(updatedSession);
  } catch (error: any) {
    console.error('Error actualizando sesión:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/comite-sessions/trust/:trustId/next-quarterly
 * Calcula la próxima reunión trimestral para un fideicomiso
 */
router.get('/trust/:trustId/next-quarterly', authenticate, async (req, res) => {
  try {
    const nextMeeting = await calculateNextQuarterlyMeeting(req.params.trustId);
    res.json({ nextMeetingDate: nextMeeting });
  } catch (error: any) {
    console.error('Error calculando próxima reunión:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/comite-sessions/trust/:trustId/generate-quarterly
 * Genera automáticamente las sesiones trimestrales para los próximos 4 trimestres
 * Requiere: COMITE_TECNICO o FIDUCIARIO
 */
router.post('/trust/:trustId/generate-quarterly', authenticate, authorize([ActorRole.COMITE_TECNICO, ActorRole.FIDUCIARIO]), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const sessions = await generateQuarterlySessions(req.params.trustId, req.user.actorId);
    res.json({ sessions, count: sessions.length });
  } catch (error: any) {
    console.error('Error generando sesiones trimestrales:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
