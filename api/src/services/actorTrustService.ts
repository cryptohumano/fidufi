/**
 * Servicio para gestionar la pertenencia de actores a fideicomisos
 */

import { prisma } from '../lib/prisma';
import { ActorRole } from '../generated/prisma/enums';

export interface AssignActorToTrustData {
  actorId: string;
  trustId: string;
  roleInTrust: ActorRole;
  partyType?: string;
}

/**
 * Asigna un actor a un fideicomiso con un rol específico
 * 
 * Nota: Los beneficiarios NO deben asignarse manualmente.
 * Se asignan automáticamente cuando se crean activos asociados a ellos.
 */
export async function assignActorToTrust(
  data: AssignActorToTrustData,
  assignedBy?: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
) {
  // Verificar que el actor existe
  const actor = await prisma.actor.findUnique({
    where: { id: data.actorId },
  });

  if (!actor) {
    throw new Error(`Actor con ID ${data.actorId} no encontrado`);
  }

  // Verificar que el fideicomiso existe
  const trust = await prisma.trust.findUnique({
    where: { trustId: data.trustId },
  });

  if (!trust) {
    throw new Error(`Fideicomiso con ID ${data.trustId} no encontrado`);
  }

  // Verificar si ya existe la relación
  const existing = await prisma.actorTrust.findUnique({
    where: {
      actorId_trustId: {
        actorId: data.actorId,
        trustId: data.trustId,
      },
    },
  });

  if (existing) {
    // Si existe pero está revocado, reactivarlo
    if (!existing.active) {
      const membership = await prisma.actorTrust.update({
        where: { id: existing.id },
        data: {
          active: true,
          roleInTrust: data.roleInTrust,
          revokedAt: null,
          ...(data.partyType !== undefined && { partyType: data.partyType }),
        },
      });

      // Registrar log de auditoría
      if (assignedBy) {
        try {
          const { createAuditLog, AuditAction, EntityType } = await import('./auditLogService');
          await createAuditLog({
            actorId: assignedBy,
            action: AuditAction.ACTOR_ASSIGNED_TO_TRUST,
            entityType: EntityType.ACTOR_TRUST,
            entityId: membership.id,
            trustId: data.trustId,
            description: `Usuario ${actor.email || actor.name || actor.id} reactivado en el fideicomiso ${data.trustId} con rol ${data.roleInTrust}`,
            metadata: {
              assignedActorId: data.actorId,
              assignedActorEmail: actor.email,
              assignedActorName: actor.name,
              roleInTrust: data.roleInTrust,
              reactivated: true,
            },
            ipAddress: requestInfo?.ipAddress,
            userAgent: requestInfo?.userAgent,
          });
        } catch (error) {
          console.error('⚠️  Error registrando log de auditoría:', error);
        }
      }

      return membership;
    }
    // Si ya está activo, actualizar el rol (y partyType si viene)
    const membership = await prisma.actorTrust.update({
      where: { id: existing.id },
      data: {
        roleInTrust: data.roleInTrust,
        ...(data.partyType !== undefined && { partyType: data.partyType }),
      },
    });

    // Registrar log de auditoría para cambio de rol
    if (assignedBy && existing.roleInTrust !== data.roleInTrust) {
      try {
        const { createAuditLog, AuditAction, EntityType } = await import('./auditLogService');
        await createAuditLog({
          actorId: assignedBy,
          action: AuditAction.ACTOR_ASSIGNED_TO_TRUST,
          entityType: EntityType.ACTOR_TRUST,
          entityId: membership.id,
          trustId: data.trustId,
          description: `Rol del usuario ${actor.email || actor.name || actor.id} actualizado en el fideicomiso ${data.trustId}: ${existing.roleInTrust} → ${data.roleInTrust}`,
          metadata: {
            assignedActorId: data.actorId,
            assignedActorEmail: actor.email,
            assignedActorName: actor.name,
            previousRole: existing.roleInTrust,
            newRole: data.roleInTrust,
          },
          ipAddress: requestInfo?.ipAddress,
          userAgent: requestInfo?.userAgent,
        });
      } catch (error) {
        console.error('⚠️  Error registrando log de auditoría:', error);
      }
    }

    return membership;
  }

  // Validar que no se intente asignar beneficiarios manualmente
  if (data.roleInTrust === 'BENEFICIARIO') {
    throw new Error('Los beneficiarios no se asignan manualmente. Se asignan automáticamente al crear activos asociados a ellos.');
  }

  // Crear nueva relación
  const membership = await prisma.actorTrust.create({
    data: {
      actorId: data.actorId,
      trustId: data.trustId,
      roleInTrust: data.roleInTrust,
      ...(data.partyType !== undefined && { partyType: data.partyType }),
    },
  });

  // Registrar log de auditoría si se proporciona assignedBy
  if (assignedBy) {
    try {
      const { createAuditLog, AuditAction, EntityType } = await import('./auditLogService');
      await createAuditLog({
        actorId: assignedBy,
        action: AuditAction.ACTOR_ASSIGNED_TO_TRUST,
        entityType: EntityType.ACTOR_TRUST,
        entityId: membership.id,
        trustId: data.trustId,
        description: `Usuario ${actor.email || actor.name || actor.id} asignado al fideicomiso ${data.trustId} con rol ${data.roleInTrust}`,
        metadata: {
          assignedActorId: data.actorId,
          assignedActorEmail: actor.email,
          assignedActorName: actor.name,
          roleInTrust: data.roleInTrust,
        },
        ipAddress: requestInfo?.ipAddress,
        userAgent: requestInfo?.userAgent,
      });
    } catch (error) {
      console.error('⚠️  Error registrando log de auditoría:', error);
    }
  }

  return membership;
}

/**
 * Revoca el acceso de un actor a un fideicomiso
 */
export async function revokeActorFromTrust(actorId: string, trustId: string) {
  const membership = await prisma.actorTrust.findUnique({
    where: {
      actorId_trustId: {
        actorId,
        trustId,
      },
    },
  });

  if (!membership) {
    throw new Error('El actor no está asignado a este fideicomiso');
  }

  return await prisma.actorTrust.update({
    where: { id: membership.id },
    data: {
      active: false,
      revokedAt: new Date(),
    },
  });
}

// Equivalencias de rol: solo FIDUCIARIO está en el enum
const FIDUCIARIO_EQUIVALENTS: ActorRole[] = [ActorRole.FIDUCIARIO];

function expandRoleEquivalents(roles: ActorRole[]): ActorRole[] {
  const set = new Set(roles);
  if (roles.some((r) => r === ActorRole.FIDUCIARIO)) {
    FIDUCIARIO_EQUIVALENTS.forEach((r) => set.add(r));
  }
  return Array.from(set);
}

/**
 * Verifica si un actor pertenece a un fideicomiso y tiene el rol adecuado
 */
export async function verifyActorTrustMembership(
  actorId: string,
  trustId: string,
  requiredRoles?: ActorRole[]
): Promise<boolean> {
  const membership = await prisma.actorTrust.findUnique({
    where: {
      actorId_trustId: {
        actorId,
        trustId,
      },
    },
  });

  if (!membership || !membership.active) {
    return false;
  }

  // Si se especifican roles requeridos, verificar que el rol del actor los incluye (con equivalencias)
  if (requiredRoles && requiredRoles.length > 0) {
    const expanded = expandRoleEquivalents(requiredRoles);
    return expanded.includes(membership.roleInTrust);
  }

  return true;
}

/**
 * Obtiene todos los fideicomisos a los que pertenece un actor
 */
export async function getActorTrusts(actorId: string) {
  return await prisma.actorTrust.findMany({
    where: {
      actorId,
      active: true,
    },
    include: {
      trust: true,
    },
    orderBy: {
      assignedAt: 'desc',
    },
  });
}

/**
 * Obtiene todos los actores asignados a un fideicomiso
 */
export async function getTrustActors(trustId: string, roleInTrust?: ActorRole) {
  const where: any = {
    trustId,
    active: true,
  };

  if (roleInTrust) {
    where.roleInTrust = roleInTrust;
  }

  return await prisma.actorTrust.findMany({
    where,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      assignedAt: 'desc',
    },
  });
}
