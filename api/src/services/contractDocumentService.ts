/**
 * Servicio de Documentos de Contrato y Anexos
 * Iteración 1
 */

import { prisma } from '../lib/prisma';
import { getTrust } from './trustService';
import { verifyActorTrustMembership } from './actorTrustService';
import { createAuditLog, AuditAction, EntityType } from './auditLogService';

export async function createContractDocument(
  trustId: string,
  data: { docType: string; name: string; documentUrl?: string; documentHash?: string; signedAt?: Date | string },
  actorId: string
) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso a este fideicomiso');

  const doc = await prisma.contractDocument.create({
    data: {
      trustId,
      docType: data.docType,
      name: data.name,
      documentUrl: data.documentUrl ?? null,
      documentHash: data.documentHash ?? null,
      signedAt: data.signedAt ? new Date(data.signedAt) : null,
    },
  });
  await createAuditLog({
    actorId,
    action: AuditAction.CONTRACT_DOCUMENT_CREATED,
    entityType: EntityType.CONTRACT_DOCUMENT,
    entityId: doc.id,
    trustId,
    description: `Documento de contrato creado: ${data.name}`,
  });
  return doc;
}

export async function getContractDocumentsByTrust(trustId: string) {
  await getTrust(trustId);
  return prisma.contractDocument.findMany({
    where: { trustId },
    include: { annexes: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function addContractAnnex(
  contractDocumentId: string,
  data: { annexType?: string; name: string; documentUrl?: string; documentHash?: string }
) {
  const doc = await prisma.contractDocument.findUnique({ where: { id: contractDocumentId } });
  if (!doc) throw new Error('Documento no encontrado');
  return prisma.contractAnnex.create({
    data: {
      contractDocumentId,
      annexType: data.annexType ?? null,
      name: data.name,
      documentUrl: data.documentUrl ?? null,
      documentHash: data.documentHash ?? null,
    },
  });
}
