/**
 * Actor Service
 * 
 * Gestiona actores del sistema (Fiduciario, Comité Técnico, Auditor, Regulador)
 * con soporte para múltiples identidades (DID, Ethereum, Polkadot, PoP)
 */

import { prisma } from '../lib/prisma';
import { ActorRole } from '../generated/prisma/enums';

export interface OnboardActorData {
  name?: string;
  role: ActorRole;
  primaryDid?: string;
  ethereumAddress?: string;
  polkadotAccountId?: string;
  ensName?: string;
  popCredentials?: Record<string, any>;
}

export interface ActorIdentity {
  type: 'did' | 'ethereum' | 'polkadot';
  value: string;
}

/**
 * Registra un nuevo actor en el sistema con soporte multi-identidad
 */
export async function onboardActor(data: OnboardActorData) {
  // Las identidades en cadena son opcionales por ahora
  // En el futuro se requerirán para verificación criptográfica

  // Verificar que las identidades no estén ya registradas
  if (data.primaryDid) {
    const existingDid = await prisma.actor.findUnique({
      where: { primaryDid: data.primaryDid },
    });
    if (existingDid) {
      throw new Error(`El DID ${data.primaryDid} ya está registrado`);
    }
  }

  if (data.ethereumAddress) {
    const existingEth = await prisma.actor.findUnique({
      where: { ethereumAddress: data.ethereumAddress },
    });
    if (existingEth) {
      throw new Error(`La dirección Ethereum ${data.ethereumAddress} ya está registrada`);
    }
  }

  if (data.polkadotAccountId) {
    const existingPolkadot = await prisma.actor.findUnique({
      where: { polkadotAccountId: data.polkadotAccountId },
    });
    if (existingPolkadot) {
      throw new Error(`El AccountId de Polkadot ${data.polkadotAccountId} ya está registrado`);
    }
  }

  // Crear el actor
  const actor = await prisma.actor.create({
    data: {
      name: data.name,
      role: data.role,
      primaryDid: data.primaryDid,
      ethereumAddress: data.ethereumAddress,
      polkadotAccountId: data.polkadotAccountId,
      ensName: data.ensName,
      popCredentials: data.popCredentials || undefined,
    },
  });

  return actor;
}

/**
 * Busca un actor por cualquiera de sus identidades
 */
export async function findActorByIdentity(identity: ActorIdentity) {
  switch (identity.type) {
    case 'did':
      return await prisma.actor.findUnique({
        where: { primaryDid: identity.value },
      });

    case 'ethereum':
      return await prisma.actor.findUnique({
        where: { ethereumAddress: identity.value },
      });

    case 'polkadot':
      return await prisma.actor.findUnique({
        where: { polkadotAccountId: identity.value },
      });

    default:
      throw new Error(`Tipo de identidad no soportado: ${identity.type}`);
  }
}

/**
 * Verifica que un actor tenga un rol específico
 */
export async function verifyActorRole(actorId: string, requiredRole: ActorRole): Promise<boolean> {
  const actor = await prisma.actor.findUnique({
    where: { id: actorId },
    select: { role: true },
  });

  if (!actor) {
    return false;
  }

  return actor.role === requiredRole;
}

/**
 * Verifica que un actor tenga uno de los roles permitidos
 */
export async function verifyActorRoles(
  actorId: string,
  allowedRoles: ActorRole[]
): Promise<boolean> {
  const actor = await prisma.actor.findUnique({
    where: { id: actorId },
    select: { role: true },
  });

  if (!actor) {
    return false;
  }

  return allowedRoles.includes(actor.role);
}

/**
 * Obtiene un actor por su ID
 */
export async function getActorById(actorId: string) {
  const actor = await prisma.actor.findUnique({
    where: { id: actorId },
  });

  if (!actor) {
    throw new Error(`Actor ${actorId} no encontrado`);
  }

  return actor;
}

/**
 * Lista todos los actores (útil para administración)
 */
export async function listActors(filters?: { role?: ActorRole }) {
  return await prisma.actor.findMany({
    where: filters,
    orderBy: { createdAt: 'desc' },
  });
}
