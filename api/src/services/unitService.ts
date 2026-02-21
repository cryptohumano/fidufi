/**
 * Unidades funcionales: Unit, UnitAllocation, UnitSelectionRound
 * Iteración 5
 */

import { prisma } from '../lib/prisma';
import { UnitStatus } from '../generated/prisma/enums';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';
import { getTrust } from './trustService';
import { verifyActorTrustMembership } from './actorTrustService';

export async function createUnit(
  trustId: string,
  data: { name: string; unitType?: string; areaSqm?: number; status?: UnitStatus; metadata?: any },
  actorId: string
) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');

  return prisma.unit.create({
    data: {
      trustId,
      name: data.name,
      unitType: data.unitType ?? null,
      areaSqm: data.areaSqm != null ? new Decimal(data.areaSqm) : null,
      status: data.status ?? UnitStatus.AVAILABLE,
      metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
    },
  });
}

export async function getUnitsByTrust(trustId: string, opts?: { status?: UnitStatus }) {
  await getTrust(trustId);
  const where: any = { trustId };
  if (opts?.status) where.status = opts.status;
  return prisma.unit.findMany({
    where,
    include: { allocations: true },
    orderBy: { name: 'asc' },
  });
}

export async function updateUnitStatus(unitId: string, status: UnitStatus, actorId: string) {
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) throw new Error('Unidad no encontrada');
  const hasAccess = await verifyActorTrustMembership(actorId, unit.trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');
  return prisma.unit.update({ where: { id: unitId }, data: { status } });
}

export async function allocateUnit(unitId: string, actorId: string, roundId: string | undefined, allocatedBy: string) {
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) throw new Error('Unidad no encontrada');
  const hasAccess = await verifyActorTrustMembership(allocatedBy, unit.trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');
  const existing = await prisma.unitAllocation.findUnique({ where: { unitId } });
  if (existing) throw new Error('La unidad ya está asignada');

  await prisma.$transaction([
    prisma.unitAllocation.create({
      data: { unitId, actorId, roundId: roundId ?? null },
    }),
    prisma.unit.update({
      where: { id: unitId },
      data: { status: UnitStatus.ASSIGNED },
    }),
  ]);
  return prisma.unit.findUnique({
    where: { id: unitId },
    include: { allocations: true },
  });
}

export async function createSelectionRound(
  trustId: string,
  data: { name: string; roundType?: string },
  actorId: string
) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');
  return prisma.unitSelectionRound.create({
    data: {
      trustId,
      name: data.name,
      roundType: data.roundType ?? 'ROTATING',
    },
  });
}

export async function getSelectionRoundsByTrust(trustId: string) {
  await getTrust(trustId);
  return prisma.unitSelectionRound.findMany({
    where: { trustId },
    orderBy: { startedAt: 'desc' },
  });
}

export async function completeSelectionRound(
  roundId: string,
  data: { minutesUrl?: string; minutesHash?: string },
  actorId: string
) {
  const round = await prisma.unitSelectionRound.findUnique({ where: { id: roundId } });
  if (!round) throw new Error('Ronda no encontrada');
  const hasAccess = await verifyActorTrustMembership(actorId, round.trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');
  return prisma.unitSelectionRound.update({
    where: { id: roundId },
    data: { completedAt: new Date(), minutesUrl: data.minutesUrl ?? null, minutesHash: data.minutesHash ?? null },
  });
}
