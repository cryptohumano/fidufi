/**
 * Comercialización: SaleProcess, SaleReservation
 * Iteración 6
 */

import { prisma } from '../lib/prisma';
import { ActorRole } from '../generated/prisma/enums';
import { getTrust } from './trustService';
import { verifyActorTrustMembership } from './actorTrustService';

export async function createSaleProcess(
  trustId: string,
  data: { unitId?: string; metadata?: any },
  actorId: string
) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');
  return prisma.saleProcess.create({
    data: {
      trustId,
      unitId: data.unitId ?? null,
      metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
    },
  });
}

export async function getSaleProcessesByTrust(
  trustId: string,
  opts?: { status?: string; callerActorId?: string }
) {
  await getTrust(trustId);
  const where: any = { trustId };
  if (opts?.status) where.status = opts.status;
  // Iteración 10: ADQUIRENTE solo ve sus operaciones (buyer o reserva)
  if (opts?.callerActorId) {
    const membership = await prisma.actorTrust.findUnique({
      where: { actorId_trustId: { actorId: opts.callerActorId, trustId } },
    });
    if (membership?.active && membership.roleInTrust === ActorRole.ADQUIRENTE) {
      where.OR = [
        { buyerActorId: opts.callerActorId },
        { reservations: { some: { interestedActorId: opts.callerActorId } } },
      ];
    }
  }
  return prisma.saleProcess.findMany({
    where,
    include: { reservations: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateSaleProcessStatus(
  id: string,
  status: string,
  actorId: string,
  buyerActorId?: string
) {
  const sale = await prisma.saleProcess.findUnique({ where: { id } });
  if (!sale) throw new Error('Operación no encontrada');
  const hasAccess = await verifyActorTrustMembership(actorId, sale.trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');
  return prisma.saleProcess.update({
    where: { id },
    data: { status, ...(buyerActorId != null && { buyerActorId }) },
  });
}

export async function addReservation(
  saleProcessId: string,
  data: { interestedActorId?: string; contactEmail?: string; contactName?: string; notes?: string }
) {
  const sale = await prisma.saleProcess.findUnique({ where: { id: saleProcessId } });
  if (!sale) throw new Error('Operación no encontrada');
  return prisma.saleReservation.create({
    data: {
      saleProcessId,
      interestedActorId: data.interestedActorId ?? null,
      contactEmail: data.contactEmail ?? null,
      contactName: data.contactName ?? null,
      notes: data.notes ?? null,
    },
  });
}
