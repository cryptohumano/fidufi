import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/internal/prismaNamespace';
import { Decimal } from 'decimal.js';
import { getTrust } from './trustService';
import { getActorById } from './actorService';
import { ActorRole } from '../generated/prisma/enums';
import { createAuditLog, AuditAction, EntityType } from './auditLogService';

export interface CreateSessionData {
  trustId: string;
  sessionDate: Date | string;
  sessionType: 'QUARTERLY' | 'EXTRAORDINARY' | 'SPECIAL';
  scheduledBy: string;
  location?: string;
  meetingLink?: string;
  agenda?: any;
  requestInfo?: { ipAddress?: string; userAgent?: string };
}

export interface UpdateSessionData {
  sessionDate?: Date | string;
  sessionType?: 'QUARTERLY' | 'EXTRAORDINARY' | 'SPECIAL';
  attendees?: string[];
  quorum?: boolean;
  agenda?: any;
  decisions?: any;
  approvedItems?: string[];
  minutes?: string;
  minutesUrl?: string;
  minutesHash?: string;
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  location?: string;
  meetingLink?: string;
}

/**
 * Crea una nueva sesión del Comité Técnico
 */
export async function createSession(data: CreateSessionData) {
  // 1. Verificar que el fideicomiso existe
  const trust = await getTrust(data.trustId);

  // 2. Verificar que el usuario tiene permisos
  const actor = await getActorById(data.scheduledBy);
  if (actor.role !== ActorRole.COMITE_TECNICO && actor.role !== ActorRole.FIDUCIARIO && !actor.isSuperAdmin) {
    throw new Error('Solo el Comité Técnico o el Fiduciario pueden agendar sesiones');
  }

  // 3. Verificar pertenencia al fideicomiso (excepto para SUPER_ADMIN)
  if (!actor.isSuperAdmin) {
    const { verifyActorTrustMembership } = await import('./actorTrustService');
    const hasAccess = await verifyActorTrustMembership(
      data.scheduledBy,
      data.trustId,
      [ActorRole.COMITE_TECNICO, ActorRole.FIDUCIARIO]
    );
    
    if (!hasAccess) {
      throw new Error('No tienes acceso a este fideicomiso o no tienes permisos para agendar sesiones');
    }
  }

  // 4. Crear la sesión
  const session = await prisma.comiteSession.create({
    data: {
      trustId: data.trustId,
      sessionDate: new Date(data.sessionDate),
      sessionType: data.sessionType,
      scheduledBy: data.scheduledBy,
      location: data.location || null,
      meetingLink: data.meetingLink || null,
      agenda: data.agenda || null,
      status: 'SCHEDULED',
      attendees: [],
      quorum: false,
      approvedItems: [],
    },
    include: {
      trust: {
        select: {
          trustId: true,
          name: true,
        },
      },
    },
  });

  // 5. Registrar log de auditoría
  try {
    await createAuditLog({
      actorId: data.scheduledBy,
      action: AuditAction.SESSION_CREATED,
      entityType: EntityType.SESSION,
      entityId: session.id,
      trustId: data.trustId,
      description: `Sesión del Comité Técnico agendada para el ${new Date(data.sessionDate).toLocaleDateString('es-MX')}. Tipo: ${data.sessionType}`,
      metadata: {
        sessionType: data.sessionType,
        sessionDate: new Date(data.sessionDate).toISOString(),
      },
      ipAddress: data.requestInfo?.ipAddress,
      userAgent: data.requestInfo?.userAgent,
    });
  } catch (error) {
    console.error('⚠️  Error registrando log de auditoría:', error);
  }

  return session;
}

/**
 * Obtiene una sesión por ID
 */
export async function getSessionById(sessionId: string) {
  const session = await prisma.comiteSession.findUnique({
    where: { id: sessionId },
    include: {
      trust: {
        select: {
          trustId: true,
          name: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error(`Sesión ${sessionId} no encontrada`);
  }

  return session;
}

/**
 * Lista sesiones de un fideicomiso con filtros opcionales
 */
export async function listSessions(filters: {
  trustId: string;
  status?: string;
  sessionType?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  limit?: number;
  offset?: number;
}) {
  const where: Prisma.ComiteSessionWhereInput = {
    trustId: filters.trustId,
  };

  if (filters.status) {
    where.status = filters.status as any;
  }

  if (filters.sessionType) {
    where.sessionType = filters.sessionType;
  }

  if (filters.startDate || filters.endDate) {
    where.sessionDate = {};
    if (filters.startDate) {
      where.sessionDate.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.sessionDate.lte = new Date(filters.endDate);
    }
  }

  const [sessions, total] = await Promise.all([
    prisma.comiteSession.findMany({
      where,
      include: {
        trust: {
          select: {
            trustId: true,
            name: true,
          },
        },
      },
      orderBy: { sessionDate: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    }),
    prisma.comiteSession.count({ where }),
  ]);

  return {
    sessions,
    total,
    limit: filters.limit || 100,
    offset: filters.offset || 0,
  };
}

/**
 * Actualiza una sesión existente
 */
export async function updateSession(
  sessionId: string,
  data: UpdateSessionData,
  updatedBy: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
) {
  // 1. Verificar que la sesión existe
  const existingSession = await getSessionById(sessionId);

  // 2. Verificar permisos
  const actor = await getActorById(updatedBy);
  if (actor.role !== ActorRole.COMITE_TECNICO && actor.role !== ActorRole.FIDUCIARIO && !actor.isSuperAdmin) {
    throw new Error('Solo el Comité Técnico o el Fiduciario pueden actualizar sesiones');
  }

  // 3. Verificar pertenencia al fideicomiso (excepto para SUPER_ADMIN)
  if (!actor.isSuperAdmin) {
    const { verifyActorTrustMembership } = await import('./actorTrustService');
    const hasAccess = await verifyActorTrustMembership(
      updatedBy,
      existingSession.trustId,
      [ActorRole.COMITE_TECNICO, ActorRole.FIDUCIARIO]
    );
    
    if (!hasAccess) {
      throw new Error('No tienes acceso a este fideicomiso o no tienes permisos para actualizar sesiones');
    }
  }

  // 4. Preparar datos de actualización
  const updateData: Prisma.ComiteSessionUpdateInput = {};

  if (data.sessionDate !== undefined) {
    updateData.sessionDate = new Date(data.sessionDate);
  }
  if (data.sessionType !== undefined) {
    updateData.sessionType = data.sessionType;
  }
  if (data.attendees !== undefined) {
    updateData.attendees = data.attendees;
  }
  if (data.quorum !== undefined) {
    updateData.quorum = data.quorum;
  }
  if (data.agenda !== undefined) {
    updateData.agenda = data.agenda;
  }
  if (data.decisions !== undefined) {
    updateData.decisions = data.decisions;
  }
  if (data.approvedItems !== undefined) {
    updateData.approvedItems = data.approvedItems;
  }
  if (data.minutes !== undefined) {
    updateData.minutes = data.minutes;
  }
  if (data.minutesUrl !== undefined) {
    updateData.minutesUrl = data.minutesUrl;
  }
  if (data.minutesHash !== undefined) {
    updateData.minutesHash = data.minutesHash;
  }
  if (data.status !== undefined) {
    updateData.status = data.status as any;
  }
  if (data.location !== undefined) {
    updateData.location = data.location;
  }
  if (data.meetingLink !== undefined) {
    updateData.meetingLink = data.meetingLink;
  }

  // 5. Actualizar la sesión
  const updatedSession = await prisma.comiteSession.update({
    where: { id: sessionId },
    data: updateData,
    include: {
      trust: {
        select: {
          trustId: true,
          name: true,
        },
      },
    },
  });

  // 6. Registrar log de auditoría
  try {
    await createAuditLog({
      actorId: updatedBy,
      action: AuditAction.SESSION_UPDATED,
      entityType: EntityType.SESSION,
      entityId: sessionId,
      trustId: existingSession.trustId,
      description: `Sesión del Comité Técnico actualizada: ${updatedSession.status}`,
      metadata: {
        sessionId,
        changes: Object.keys(updateData),
        status: updatedSession.status,
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });
  } catch (error) {
    console.error('⚠️  Error registrando log de auditoría:', error);
  }

  return updatedSession;
}

/**
 * Calcula la próxima reunión trimestral para un fideicomiso
 * Según el contrato, las reuniones son cada 3 meses
 */
export async function calculateNextQuarterlyMeeting(trustId: string): Promise<Date> {
  const trust = await getTrust(trustId);
  
  // Usar la fecha de constitución o la fecha de creación del trust
  const startDate = trust.constitutionDate || trust.createdAt;
  const now = new Date();
  
  // Calcular meses desde la constitución
  const monthsSinceStart = (now.getFullYear() - startDate.getFullYear()) * 12 + 
                          (now.getMonth() - startDate.getMonth());
  
  // Próxima reunión es el siguiente múltiplo de 3 meses
  const nextMeetingMonths = Math.ceil((monthsSinceStart + 1) / 3) * 3;
  const nextMeetingDate = new Date(startDate);
  nextMeetingDate.setMonth(startDate.getMonth() + nextMeetingMonths);
  nextMeetingDate.setDate(15); // Asumimos reunión el día 15
  
  return nextMeetingDate;
}

/**
 * Genera automáticamente las sesiones trimestrales para un fideicomiso
 * Crea sesiones para los próximos 4 trimestres si no existen
 */
export async function generateQuarterlySessions(trustId: string, scheduledBy: string) {
  const sessions = [];
  const nextMeeting = await calculateNextQuarterlyMeeting(trustId);
  
  // Crear sesiones para los próximos 4 trimestres
  for (let i = 0; i < 4; i++) {
    const sessionDate = new Date(nextMeeting);
    sessionDate.setMonth(nextMeeting.getMonth() + (i * 3));
    
    // Verificar si ya existe una sesión para esta fecha
    const existing = await prisma.comiteSession.findFirst({
      where: {
        trustId,
        sessionDate: {
          gte: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()),
          lt: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate() + 1),
        },
        sessionType: 'QUARTERLY',
      },
    });
    
    if (!existing) {
      const session = await createSession({
        trustId,
        sessionDate,
        sessionType: 'QUARTERLY',
        scheduledBy,
      });
      sessions.push(session);
    }
  }
  
  return sessions;
}
