/**
 * Servicio de Hitos de obra (Milestone)
 * Iteración 3
 */

import { prisma } from '../lib/prisma';
import { getTrust } from './trustService';
import { verifyActorTrustMembership } from './actorTrustService';
import { createAuditLog, AuditAction, EntityType } from './auditLogService';

export async function createMilestone(
  trustId: string,
  data: {
    name: string;
    description?: string;
    dueDate?: Date | string;
    progressPercent?: number;
    parentId?: string;
    evidenceUrl?: string;
    evidenceHash?: string;
    metadata?: any;
  },
  actorId: string
) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso a este fideicomiso');

  const milestone = await prisma.milestone.create({
    data: {
      trustId,
      name: data.name,
      description: data.description ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      progressPercent: data.progressPercent ?? 0,
      parentId: data.parentId ?? null,
      evidenceUrl: data.evidenceUrl ?? null,
      evidenceHash: data.evidenceHash ?? null,
      metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
    },
  });
  await createAuditLog({
    actorId,
    action: AuditAction.MILESTONE_CREATED,
    entityType: EntityType.MILESTONE,
    entityId: milestone.id,
    trustId,
    description: `Hito creado: ${data.name}`,
  });
  return milestone;
}

export async function getMilestonesByTrust(trustId: string, opts?: { parentId?: string | null }) {
  await getTrust(trustId);
  const where: any = { trustId };
  if (opts?.parentId !== undefined) where.parentId = opts.parentId;
  return prisma.milestone.findMany({
    where,
    include: { children: true, expenses: true },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getMilestoneById(id: string) {
  const m = await prisma.milestone.findUnique({
    where: { id },
    include: { children: true, expenses: true },
  });
  if (!m) throw new Error('Hito no encontrado');
  return m;
}

export async function updateMilestone(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    dueDate: Date | string;
    completedAt: Date | string | null;
    progressPercent: number;
    evidenceUrl: string;
    evidenceHash: string;
    metadata: any;
  }>,
  actorId: string
) {
  const existing = await getMilestoneById(id);
  const hasAccess = await verifyActorTrustMembership(actorId, existing.trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');

  const milestone = await prisma.milestone.update({
    where: { id },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.description != null && { description: data.description }),
      ...(data.dueDate != null && { dueDate: new Date(data.dueDate) }),
      ...(data.completedAt !== undefined && { completedAt: data.completedAt ? new Date(data.completedAt) : null }),
      ...(data.progressPercent != null && { progressPercent: data.progressPercent }),
      ...(data.evidenceUrl != null && { evidenceUrl: data.evidenceUrl }),
      ...(data.evidenceHash != null && { evidenceHash: data.evidenceHash }),
      ...(data.metadata != null && { metadata: data.metadata }),
    },
  });
  await createAuditLog({
    actorId,
    action: AuditAction.MILESTONE_UPDATED,
    entityType: EntityType.MILESTONE,
    entityId: id,
    trustId: existing.trustId,
    description: `Hito actualizado: ${milestone.name}`,
  });
  return milestone;
}
