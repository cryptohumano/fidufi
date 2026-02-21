/**
 * Servicio de Pólizas de Seguro
 * Iteración 1
 */

import { prisma } from '../lib/prisma';
import { getTrust } from './trustService';
import { verifyActorTrustMembership } from './actorTrustService';
import { createAuditLog, AuditAction, EntityType } from './auditLogService';

export async function createInsurancePolicy(
  trustId: string,
  data: {
    policyType: string;
    insurer?: string;
    policyNumber?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    documentUrl?: string;
    documentHash?: string;
  },
  actorId: string
) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso a este fideicomiso');

  const policy = await prisma.insurancePolicy.create({
    data: {
      trustId,
      policyType: data.policyType,
      insurer: data.insurer ?? null,
      policyNumber: data.policyNumber ?? null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      documentUrl: data.documentUrl ?? null,
      documentHash: data.documentHash ?? null,
    },
  });
  await createAuditLog({
    actorId,
    action: AuditAction.INSURANCE_POLICY_CREATED,
    entityType: EntityType.INSURANCE_POLICY,
    entityId: policy.id,
    trustId,
    description: `Póliza creada: ${data.policyType}`,
  });
  return policy;
}

export async function getInsurancePoliciesByTrust(trustId: string) {
  await getTrust(trustId);
  return prisma.insurancePolicy.findMany({ where: { trustId }, orderBy: { endDate: 'asc' } });
}

export async function updateInsurancePolicy(
  id: string,
  data: Partial<{ endDate: Date | string; documentUrl: string; documentHash: string }>,
  actorId: string
) {
  const existing = await prisma.insurancePolicy.findUnique({ where: { id } });
  if (!existing) throw new Error('Póliza no encontrada');
  const hasAccess = await verifyActorTrustMembership(actorId, existing.trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');

  const policy = await prisma.insurancePolicy.update({
    where: { id },
    data: {
      ...(data.endDate != null && { endDate: new Date(data.endDate) }),
      ...(data.documentUrl != null && { documentUrl: data.documentUrl }),
      ...(data.documentHash != null && { documentHash: data.documentHash }),
    },
  });
  await createAuditLog({
    actorId,
    action: AuditAction.INSURANCE_POLICY_UPDATED,
    entityType: EntityType.INSURANCE_POLICY,
    entityId: id,
    trustId: existing.trustId,
    description: `Póliza actualizada: ${existing.policyType}`,
  });
  return policy;
}
