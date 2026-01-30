/**
 * Servicio de autenticación
 * Maneja login, registro y gestión de usuarios
 */

import { prisma } from '../lib/prisma';
import { ActorRole } from '../generated/prisma/enums';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { getActorById } from './actorService';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  role: ActorRole;
}

export interface AuthResponse {
  actor: {
    id: string;
    name: string | null;
    email: string | null;
    role: ActorRole;
    isSuperAdmin: boolean;
  };
  token: string;
}

/**
 * Login con email y contraseña
 */
export async function login(data: LoginData): Promise<AuthResponse> {
  const actor = await prisma.actor.findUnique({
    where: { email: data.email },
  });

  if (!actor) {
    throw new Error('Email o contraseña incorrectos');
  }

  if (!actor.passwordHash) {
    throw new Error('Este usuario no tiene contraseña configurada');
  }

  const isValid = await verifyPassword(data.password, actor.passwordHash);
  if (!isValid) {
    throw new Error('Email o contraseña incorrectos');
  }

  const token = generateToken({
    id: actor.id,
    role: actor.role,
    primaryDid: actor.primaryDid,
    ethereumAddress: actor.ethereumAddress,
    polkadotAccountId: actor.polkadotAccountId,
  });

  return {
    actor: {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: actor.role,
      isSuperAdmin: actor.isSuperAdmin,
    },
    token,
  };
}

/**
 * Registro de nuevo usuario (solo Super Admin puede crear usuarios)
 */
export async function registerUser(data: RegisterData, createdBy: string): Promise<AuthResponse> {
  // Verificar que el creador es Super Admin
  const creator = await prisma.actor.findUnique({
    where: { id: createdBy },
  });
  
  if (!creator) {
    throw new Error('Usuario creador no encontrado');
  }
  
  if (creator.role !== ActorRole.SUPER_ADMIN && !creator.isSuperAdmin) {
    throw new Error('Solo el Super Admin puede crear usuarios');
  }

  // Verificar que el email no esté en uso
  const existing = await prisma.actor.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error('Este email ya está registrado');
  }

  // Hashear contraseña
  const passwordHash = await hashPassword(data.password);

  // Crear usuario
  const actor = await prisma.actor.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
      isSuperAdmin: data.role === ActorRole.SUPER_ADMIN || false,
    },
  });

  const token = generateToken({
    id: actor.id,
    role: actor.role,
    primaryDid: actor.primaryDid,
    ethereumAddress: actor.ethereumAddress,
    polkadotAccountId: actor.polkadotAccountId,
  });

  return {
    actor: {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: actor.role,
      isSuperAdmin: actor.isSuperAdmin,
    },
    token,
  };
}

/**
 * Cambiar contraseña
 */
export async function changePassword(actorId: string, oldPassword: string, newPassword: string): Promise<void> {
  const actor = await prisma.actor.findUnique({
    where: { id: actorId },
  });

  if (!actor || !actor.passwordHash) {
    throw new Error('Usuario no encontrado');
  }

  const isValid = await verifyPassword(oldPassword, actor.passwordHash);
  if (!isValid) {
    throw new Error('Contraseña actual incorrecta');
  }

  const newHash = await hashPassword(newPassword);
  await prisma.actor.update({
    where: { id: actorId },
    data: { passwordHash: newHash },
  });
}
