/**
 * Servicio para gestionar la pertenencia de actores a fideicomisos
 */

import { prisma } from '../lib/prisma';
import { ActorRole } from '../generated/prisma/enums';

export interface AssignActorToTrustData {
  actorId: string;
  trustId: string;
  roleInTrust: ActorRole;
}

/**
 * Asigna un actor a un fideicomiso con un rol específico
 */
export async function assignActorToTrust(data: AssignActorToTrustData) {
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
      return await prisma.actorTrust.update({
        where: { id: existing.id },
        data: {
          active: true,
          roleInTrust: data.roleInTrust,
          revokedAt: null,
        },
      });
    }
    // Si ya está activo, actualizar el rol
    return await prisma.actorTrust.update({
      where: { id: existing.id },
      data: {
        roleInTrust: data.roleInTrust,
      },
    });
  }

  // Crear nueva relación
  return await prisma.actorTrust.create({
    data: {
      actorId: data.actorId,
      trustId: data.trustId,
      roleInTrust: data.roleInTrust,
    },
  });
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

  // Si se especifican roles requeridos, verificar que el rol del actor los incluye
  if (requiredRoles && requiredRoles.length > 0) {
    return requiredRoles.includes(membership.roleInTrust);
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
