/**
 * Servicio de Aportes (Contributions)
 * Iteración 1: CRUD y estados para flujo Aportes → Mora
 */

import { prisma } from '../lib/prisma';
import { ContributionType, ContributionStatus } from '../generated/prisma/enums';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';
import { getTrust } from './trustService';
import { getActorById } from './actorService';
import { verifyActorTrustMembership } from './actorTrustService';
import { createAuditLog, AuditAction, EntityType } from './auditLogService';

export interface CreateContributionData {
  trustId: string;
  contributorId?: string;
  concept: string;
  amount: number | Decimal;
  currency?: string;
  contributionType?: ContributionType;
  dueDate: Date | string;
  evidenceUrl?: string;
  evidenceHash?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
  requestInfo?: { ipAddress?: string; userAgent?: string };
}

export async function createContribution(data: CreateContributionData) {
  await getTrust(data.trustId);
  await getActorById(data.createdBy);
  const hasAccess = await verifyActorTrustMembership(
    data.createdBy,
    data.trustId,
    ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']
  );
  if (!hasAccess) {
    throw new Error('No tienes acceso a este fideicomiso para crear aportes');
  }

  const due = new Date(data.dueDate);
  const status = due < new Date() ? ContributionStatus.OVERDUE : ContributionStatus.PENDING;

  const contribution = await prisma.contribution.create({
    data: {
      trustId: data.trustId,
      contributorId: data.contributorId ?? null,
      concept: data.concept,
      amount: new Decimal(data.amount),
      currency: data.currency ?? 'MXN',
      contributionType: data.contributionType ?? ContributionType.MONEY,
      dueDate: due,
      status,
      evidenceUrl: data.evidenceUrl ?? null,
      evidenceHash: data.evidenceHash ?? null,
      metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
    },
  });

  const reqInfo = data.requestInfo ?? {};
  await createAuditLog({
    actorId: data.createdBy,
    action: AuditAction.CONTRIBUTION_CREATED,
    entityType: EntityType.CONTRIBUTION,
    entityId: contribution.id,
    trustId: data.trustId,
    description: `Aporte creado: ${data.concept} - ${data.amount} ${data.currency ?? 'MXN'}`,
    metadata: { contributionId: contribution.id, amount: Number(data.amount) },
    ...reqInfo,
  });

  return contribution;
}

/** Actualiza aportes PENDING con vencimiento pasado a OVERDUE */
async function refreshOverdueStatus(trustId: string): Promise<void> {
  const now = new Date();
  await prisma.contribution.updateMany({
    where: { trustId, status: ContributionStatus.PENDING, dueDate: { lt: now } },
    data: { status: ContributionStatus.OVERDUE },
  });
}

export async function getContributionsByTrust(
  trustId: string,
  opts?: { status?: ContributionStatus; contributorId?: string; limit?: number; offset?: number }
) {
  await getTrust(trustId);
  await refreshOverdueStatus(trustId);
  const where: any = { trustId };
  if (opts?.status) where.status = opts.status;
  if (opts?.contributorId) where.contributorId = opts.contributorId;

  const [items, total] = await Promise.all([
    prisma.contribution.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      take: opts?.limit ?? 100,
      skip: opts?.offset ?? 0,
    }),
    prisma.contribution.count({ where }),
  ]);
  return { items, total };
}

export async function getContributionById(id: string) {
  const c = await prisma.contribution.findUnique({ where: { id } });
  if (!c) throw new Error('Aporte no encontrado');
  return c;
}

export async function updateContribution(
  id: string,
  data: Partial<{ concept: string; amount: number | Decimal; dueDate: Date | string; evidenceUrl: string; evidenceHash: string; metadata: any }>,
  actorId: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
) {
  const existing = await getContributionById(id);
  const hasAccess = await verifyActorTrustMembership(actorId, existing.trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('No tienes acceso para modificar este aporte');

  const contribution = await prisma.contribution.update({
    where: { id },
    data: {
      ...(data.concept != null && { concept: data.concept }),
      ...(data.amount != null && { amount: new Decimal(data.amount) }),
      ...(data.dueDate != null && { dueDate: new Date(data.dueDate) }),
      ...(data.evidenceUrl != null && { evidenceUrl: data.evidenceUrl }),
      ...(data.evidenceHash != null && { evidenceHash: data.evidenceHash }),
      ...(data.metadata != null && { metadata: data.metadata }),
    },
  });

  await createAuditLog({
    actorId,
    action: AuditAction.CONTRIBUTION_UPDATED,
    entityType: EntityType.CONTRIBUTION,
    entityId: id,
    trustId: existing.trustId,
    description: `Aporte actualizado: ${contribution.concept}`,
    metadata: { contributionId: id },
    ...requestInfo,
  });
  return contribution;
}

export async function markContributionPaid(id: string, actorId: string, requestInfo?: { ipAddress?: string; userAgent?: string }) {
  const existing = await getContributionById(id);
  const hasAccess = await verifyActorTrustMembership(actorId, existing.trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('No tienes acceso para marcar este aporte como pagado');

  const contribution = await prisma.contribution.update({
    where: { id },
    data: { status: ContributionStatus.PAID, paidAt: new Date() },
  });

  await createAuditLog({
    actorId,
    action: AuditAction.CONTRIBUTION_PAID,
    entityType: EntityType.CONTRIBUTION,
    entityId: id,
    trustId: existing.trustId,
    description: `Aporte marcado como pagado: ${contribution.concept}`,
    metadata: { contributionId: id },
    ...requestInfo,
  });
  return contribution;
}

/** Registra el envío de intimación por aporte en mora (plantilla + documento) */
export async function recordIntimacionSent(
  id: string,
  actorId: string,
  data: { templateKey?: string; documentUrl?: string },
  requestInfo?: { ipAddress?: string; userAgent?: string }
) {
  const existing = await getContributionById(id);
  const hasAccess = await verifyActorTrustMembership(actorId, existing.trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('No tienes acceso para registrar intimación');
  if (existing.status !== ContributionStatus.OVERDUE && existing.status !== ContributionStatus.PENDING) {
    throw new Error('Solo se puede enviar intimación para aportes pendientes o en mora');
  }

  const contribution = await prisma.contribution.update({
    where: { id },
    data: {
      intimacionSentAt: new Date(),
      intimacionDocUrl: data.documentUrl ?? null,
      intimacionTemplate: data.templateKey ?? 'default_15_days',
    },
  });

  await createAuditLog({
    actorId,
    action: AuditAction.CONTRIBUTION_INTIMATION_SENT,
    entityType: EntityType.CONTRIBUTION,
    entityId: id,
    trustId: existing.trustId,
    description: `Intimación enviada por aporte en mora: ${existing.concept}`,
    metadata: { contributionId: id, templateKey: data.templateKey, event: 'incumplimiento' },
    ...requestInfo,
  });
  return contribution;
}
