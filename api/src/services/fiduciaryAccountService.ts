/**
 * Servicio de Cuentas Fiduciarias y Movimientos
 * Iteración 1
 */

import { prisma } from '../lib/prisma';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';
import { getTrust } from './trustService';
import { verifyActorTrustMembership } from './actorTrustService';
import { createAuditLog, AuditAction, EntityType } from './auditLogService';

export async function createFiduciaryAccount(
  trustId: string,
  data: { name: string; accountNumber?: string; bankName?: string; currency?: string; isDefault?: boolean },
  actorId: string
) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso a este fideicomiso');

  const account = await prisma.fiduciaryAccount.create({
    data: {
      trustId,
      name: data.name,
      accountNumber: data.accountNumber ?? null,
      bankName: data.bankName ?? null,
      currency: data.currency ?? 'MXN',
      isDefault: data.isDefault ?? false,
    },
  });
  await createAuditLog({
    actorId,
    action: AuditAction.FIDUCIARY_ACCOUNT_CREATED,
    entityType: EntityType.FIDUCIARY_ACCOUNT,
    entityId: account.id,
    trustId,
    description: `Cuenta fiduciaria creada: ${data.name}`,
  });
  return account;
}

export async function getFiduciaryAccountsByTrust(trustId: string) {
  await getTrust(trustId);
  return prisma.fiduciaryAccount.findMany({
    where: { trustId },
    include: { movements: { orderBy: { date: 'desc' }, take: 50 } },
  });
}

export async function createBankMovement(
  accountId: string,
  data: { date: Date | string; concept: string; amount: number | Decimal; balance?: number | Decimal; reference?: string },
  actorId: string
) {
  const account = await prisma.fiduciaryAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error('Cuenta no encontrada');
  const hasAccess = await verifyActorTrustMembership(actorId, account.trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');

  const movement = await prisma.bankMovement.create({
    data: {
      accountId,
      date: new Date(data.date),
      concept: data.concept,
      amount: new Decimal(data.amount),
      balance: data.balance != null ? new Decimal(data.balance) : null,
      reference: data.reference ?? null,
    },
  });
  await createAuditLog({
    actorId,
    action: AuditAction.BANK_MOVEMENT_CREATED,
    entityType: EntityType.BANK_MOVEMENT,
    entityId: movement.id,
    trustId: account.trustId,
    description: `Movimiento registrado: ${data.concept}`,
  });
  return movement;
}
