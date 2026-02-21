/**
 * Servicio de Presupuesto (BudgetItem, CashflowPlan)
 * Iteración 1
 */

import { prisma } from '../lib/prisma';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';
import { getTrust } from './trustService';
import { verifyActorTrustMembership } from './actorTrustService';
import { createAuditLog, AuditAction, EntityType } from './auditLogService';

export async function createBudgetItem(
  trustId: string,
  data: { name: string; code?: string; amount: number | Decimal; currency?: string; metadata?: any },
  actorId: string
) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso a este fideicomiso');

  const item = await prisma.budgetItem.create({
    data: {
      trustId,
      name: data.name,
      code: data.code ?? null,
      amount: new Decimal(data.amount),
      currency: data.currency ?? 'MXN',
      metadata: data.metadata ?? undefined,
    },
  });
  await createAuditLog({
    actorId,
    action: AuditAction.BUDGET_ITEM_CREATED,
    entityType: EntityType.BUDGET_ITEM,
    entityId: item.id,
    trustId,
    description: `Rubro de presupuesto creado: ${data.name}`,
  });
  return item;
}

export async function getBudgetItemsByTrust(trustId: string) {
  await getTrust(trustId);
  return prisma.budgetItem.findMany({ where: { trustId }, orderBy: { name: 'asc' } });
}

export async function createCashflowPlan(
  trustId: string,
  data: { name: string; planType: string; schedule: any; totalAmount: number | Decimal; currency?: string },
  actorId: string
) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso a este fideicomiso');

  const plan = await prisma.cashflowPlan.create({
    data: {
      trustId,
      name: data.name,
      planType: data.planType,
      schedule: data.schedule,
      totalAmount: new Decimal(data.totalAmount),
      currency: data.currency ?? 'MXN',
    },
  });
  await createAuditLog({
    actorId,
    action: AuditAction.CASHFLOW_PLAN_CREATED,
    entityType: EntityType.CASHFLOW_PLAN,
    entityId: plan.id,
    trustId,
    description: `Plan de flujo de fondos creado: ${data.name}`,
  });
  return plan;
}

export async function getCashflowPlansByTrust(trustId: string) {
  await getTrust(trustId);
  return prisma.cashflowPlan.findMany({ where: { trustId }, orderBy: { createdAt: 'desc' } });
}
