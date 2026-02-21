/**
 * Policy engine: ApprovalPolicy y ApprovalRequest
 * Iteración 4
 */

import { prisma } from '../lib/prisma';
import { getTrust } from './trustService';
import { verifyActorTrustMembership } from './actorTrustService';
import { ActorRole } from '../generated/prisma/enums';
import { createAuditLog, AuditAction, EntityType } from './auditLogService';

export async function getPolicy(trustId: string, actionType: string) {
  await getTrust(trustId);
  return prisma.approvalPolicy.findUnique({
    where: { trustId_actionType: { trustId, actionType } },
  });
}

export async function listPoliciesByTrust(trustId: string) {
  await getTrust(trustId);
  return prisma.approvalPolicy.findMany({ where: { trustId } });
}

export async function upsertPolicy(
  trustId: string,
  actionType: string,
  data: {
    ruleType: string;
    requiredRoles?: string[];
    deadlineDays?: number;
    silenceMeans?: string;
    documentationRequired?: any;
  },
  actorId: string
) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');

  return prisma.approvalPolicy.upsert({
    where: { trustId_actionType: { trustId, actionType } },
    create: {
      trustId,
      actionType,
      ruleType: data.ruleType,
      requiredRoles: data.requiredRoles ?? [],
      deadlineDays: data.deadlineDays ?? null,
      silenceMeans: data.silenceMeans ?? null,
      documentationRequired: data.documentationRequired ?? undefined,
    },
    update: {
      ruleType: data.ruleType,
      requiredRoles: data.requiredRoles ?? [],
      deadlineDays: data.deadlineDays ?? null,
      silenceMeans: data.silenceMeans ?? null,
      documentationRequired: data.documentationRequired ?? undefined,
    },
  });
}

export async function createApprovalRequest(
  trustId: string,
  data: { actionType: string; entityType: string; entityId: string },
  requestedBy: string
) {
  await getTrust(trustId);
  const existing = await prisma.approvalRequest.findFirst({
    where: {
      trustId,
      entityType: data.entityType,
      entityId: data.entityId,
      status: 'PENDING',
    },
  });
  if (existing) return existing;

  const request = await prisma.approvalRequest.create({
    data: {
      trustId,
      actionType: data.actionType,
      entityType: data.entityType,
      entityId: data.entityId,
      requestedBy,
    },
  });
  await createAuditLog({
    actorId: requestedBy,
    action: AuditAction.APPROVAL_REQUEST_CREATED,
    entityType: EntityType.APPROVAL_REQUEST,
    entityId: request.id,
    trustId,
    description: `Solicitud de aprobación: ${data.actionType} para ${data.entityType}/${data.entityId}`,
  });
  return request;
}

export async function getApprovalRequestsByTrust(trustId: string, opts?: { status?: string }) {
  await getTrust(trustId);
  const where: any = { trustId };
  if (opts?.status) where.status = opts.status;
  return prisma.approvalRequest.findMany({
    where,
    include: { votes: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addApprovalVote(
  requestId: string,
  voterId: string,
  vote: 'APPROVE' | 'REJECT',
  reason?: string
) {
  const request = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: { votes: true },
  });
  if (!request) throw new Error('Solicitud no encontrada');
  if (request.status !== 'PENDING') throw new Error('La solicitud ya fue resuelta');

  const policy = await getPolicy(request.trustId, request.actionType);
  const hasAccess = await verifyActorTrustMembership(voterId, request.trustId, [
    'FIDUCIARIO',
    'COMITE_TECNICO',
    'SUPER_ADMIN',
  ]);
  if (!hasAccess) throw new Error('Sin acceso para votar');

  await prisma.approvalVote.upsert({
    where: { requestId_voterId: { requestId, voterId } },
    create: { requestId, voterId, vote, reason: reason ?? null },
    update: { vote, reason: reason ?? null },
  });

  const updated = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: { votes: true },
  })!;
  const votes = updated!.votes;
  const approved = votes.filter((v) => v.vote === 'APPROVE').length;
  const rejected = votes.filter((v) => v.vote === 'REJECT').length;
  const required = policy?.requiredRoles?.length ?? 1;
  const ruleType = policy?.ruleType ?? 'MAJORITY';

  let newStatus: string | null = null;
  if (ruleType === 'UNANIMOUS') {
    if (rejected > 0) newStatus = 'REJECTED';
    else if (approved >= required) newStatus = 'APPROVED';
  } else if (ruleType === 'MAJORITY' || ruleType === 'ROLE') {
    if (approved > votes.length / 2) newStatus = 'APPROVED';
    else if (rejected > votes.length / 2 || rejected >= required) newStatus = 'REJECTED';
  }

  if (newStatus) {
    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: newStatus, resolvedAt: new Date(), resolvedBy: voterId },
    });
    await createAuditLog({
      actorId: voterId,
      action:
        newStatus === 'APPROVED' ? AuditAction.APPROVAL_REQUEST_APPROVED : AuditAction.APPROVAL_REQUEST_REJECTED,
      entityType: EntityType.APPROVAL_REQUEST,
      entityId: requestId,
      trustId: request.trustId,
      description: `Solicitud ${newStatus === 'APPROVED' ? 'aprobada' : 'rechazada'}: ${request.actionType}`,
    });
  }

  return prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: { votes: true },
  });
}
