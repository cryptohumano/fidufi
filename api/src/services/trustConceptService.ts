/**
 * Glosario de conceptos por fideicomiso (Iteración 9)
 */

import { prisma } from '../lib/prisma';
import { getTrust } from './trustService';
import { verifyActorTrustMembership } from './actorTrustService';

export async function getConceptsByTrust(trustId: string) {
  await getTrust(trustId);
  return prisma.trustConcept.findMany({
    where: { trustId },
    orderBy: { conceptKey: 'asc' },
  });
}

export async function getConceptByKey(trustId: string, conceptKey: string) {
  await getTrust(trustId);
  const c = await prisma.trustConcept.findUnique({
    where: { trustId_conceptKey: { trustId, conceptKey } },
  });
  return c ?? null;
}

/** Resuelve displayName: si existe concepto para el trust, devuelve displayName; si no, fallback. */
export async function resolveDisplayName(
  trustId: string,
  conceptKey: string,
  fallback: string
): Promise<string> {
  const c = await getConceptByKey(trustId, conceptKey);
  return c?.displayName ?? fallback;
}

export async function upsertConcept(
  trustId: string,
  data: { conceptKey: string; displayName: string; description?: string },
  actorId: string
) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, [
    'FIDUCIARIO',
    'COMITE_TECNICO',
    'SUPER_ADMIN',
  ]);
  if (!hasAccess) throw new Error('Sin acceso');
  return prisma.trustConcept.upsert({
    where: { trustId_conceptKey: { trustId, conceptKey: data.conceptKey } },
    create: {
      trustId,
      conceptKey: data.conceptKey,
      displayName: data.displayName,
      description: data.description ?? null,
    },
    update: {
      displayName: data.displayName,
      description: data.description ?? null,
    },
  });
}

export async function deleteConcept(trustId: string, conceptKey: string, actorId: string) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, [
    'FIDUCIARIO',
    'COMITE_TECNICO',
    'SUPER_ADMIN',
  ]);
  if (!hasAccess) throw new Error('Sin acceso');
  await prisma.trustConcept.delete({
    where: { trustId_conceptKey: { trustId, conceptKey } },
  });
  return { deleted: true };
}
