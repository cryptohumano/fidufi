/**
 * Servicio de Gastos (Expense, SupportingDocument)
 * Iteración 1
 */

import { prisma } from '../lib/prisma';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';
import { getTrust } from './trustService';
import { verifyActorTrustMembership } from './actorTrustService';
import { createAuditLog, AuditAction, EntityType } from './auditLogService';

export async function createExpense(
  trustId: string,
  data: {
    budgetItemId?: string;
    milestoneId?: string;
    concept: string;
    amount: number | Decimal;
    currency?: string;
    expenseType?: string;
    fiduciaryAccountId?: string;
    metadata?: any;
  },
  actorId: string
) {
  await getTrust(trustId);
  const hasAccess = await verifyActorTrustMembership(actorId, trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso a este fideicomiso');

  const expense = await prisma.expense.create({
    data: {
      trustId,
      budgetItemId: data.budgetItemId ?? null,
      milestoneId: data.milestoneId ?? null,
      concept: data.concept,
      amount: new Decimal(data.amount),
      currency: data.currency ?? 'MXN',
      expenseType: data.expenseType ?? null,
      fiduciaryAccountId: data.fiduciaryAccountId ?? null,
      metadata: data.metadata ?? undefined,
    },
  });
  await createAuditLog({
    actorId,
    action: AuditAction.EXPENSE_CREATED,
    entityType: EntityType.EXPENSE,
    entityId: expense.id,
    trustId,
    description: `Gasto registrado: ${data.concept}`,
  });
  return expense;
}

export async function getExpensesByTrust(trustId: string, opts?: { budgetItemId?: string; limit?: number }) {
  await getTrust(trustId);
  const where: any = { trustId };
  if (opts?.budgetItemId) where.budgetItemId = opts.budgetItemId;
  return prisma.expense.findMany({
    where,
    include: { budgetItem: true, supportingDocuments: true },
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 100,
  });
}

export async function markExpensePaid(id: string, actorId: string, fiduciaryAccountId?: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new Error('Gasto no encontrado');
  const hasAccess = await verifyActorTrustMembership(actorId, expense.trustId, ['FIDUCIARIO', 'COMITE_TECNICO', 'SUPER_ADMIN']);
  if (!hasAccess) throw new Error('Sin acceso');

  const updated = await prisma.expense.update({
    where: { id },
    data: { paidAt: new Date(), ...(fiduciaryAccountId && { fiduciaryAccountId }) },
  });
  await createAuditLog({
    actorId,
    action: AuditAction.EXPENSE_PAID,
    entityType: EntityType.EXPENSE,
    entityId: id,
    trustId: expense.trustId,
    description: `Gasto marcado como pagado: ${expense.concept}`,
  });
  return updated;
}

export async function addSupportingDocument(expenseId: string, data: { documentUrl?: string; documentHash?: string; docType?: string }) {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) throw new Error('Gasto no encontrado');
  return prisma.supportingDocument.create({
    data: { expenseId, documentUrl: data.documentUrl ?? null, documentHash: data.documentHash ?? null, docType: data.docType ?? null },
  });
}
