/**
 * Checklist operativo de cumplimiento (Iteración 8)
 */

import { prisma } from '../lib/prisma';
import { getTrust } from './trustService';
import { verifyActorTrustMembership } from './actorTrustService';

export async function createChecklistItem(
  trustId: string,
  data: { title: string; description?: string; category?: string; dueDate?: Date | string },
  actorId: string
) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');
  return prisma.checklistItem.create({
    data: {
      trustId,
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });
}

export async function getChecklistByTrust(trustId: string) {
  await getTrust(trustId);
  return prisma.checklistItem.findMany({
    where: { trustId },
    orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
  });
}

export async function toggleChecklistItem(id: string, completed: boolean, actorId: string) {
  const item = await prisma.checklistItem.findUnique({ where: { id } });
  if (!item) throw new Error('Item no encontrado');
  const hasAccess = await verifyActorTrustMembership(actorId, item.trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');
  return prisma.checklistItem.update({
    where: { id },
    data: { completed, completedAt: completed ? new Date() : null },
  });
}
