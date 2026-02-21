/**
 * Servicio de autenticación
 * Maneja login, registro y gestión de usuarios
 */

import { prisma } from '../lib/prisma';
import { ActorRole } from '../generated/prisma/enums';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { getActorById } from './actorService';
import { createAuditLog, AuditAction, EntityType } from './auditLogService';

export interface LoginData {
  email: string;
  password: string;
  location?: { latitude?: number; longitude?: number; accuracy?: number } | null;
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
export async function login(
  data: LoginData,
  requestInfo?: { ipAddress?: string; userAgent?: string; location?: { latitude?: number; longitude?: number; accuracy?: number } | null }
): Promise<AuthResponse> {
  const actor = await prisma.actor.findUnique({
    where: { email: data.email },
  });

  if (!actor) {
    // Registrar intento de login fallido (sin actorId específico)
    // Usamos un UUID especial para acciones del sistema
    try {
      // Usar el UUID especial del sistema para login fallido sin usuario
      await createAuditLog({
        actorId: '00000000-0000-0000-0000-000000000000',
        action: AuditAction.LOGIN_FAILED,
        description: `Intento de login fallido con email: ${data.email}`,
        ipAddress: requestInfo?.ipAddress,
        userAgent: requestInfo?.userAgent,
        metadata: {
          email: data.email,
          reason: 'Usuario no encontrado',
        },
      });
    } catch (error) {
      // No fallar el login si el logging falla
    }
    throw new Error('Email o contraseña incorrectos');
  }

  if (!actor.passwordHash) {
    throw new Error('Este usuario no tiene contraseña configurada');
  }

  const isValid = await verifyPassword(data.password, actor.passwordHash);
  if (!isValid) {
    // Registrar intento de login fallido
    try {
      await createAuditLog({
        actorId: actor.id,
        action: AuditAction.LOGIN_FAILED,
        description: `Intento de login fallido para usuario: ${actor.email}`,
        ipAddress: requestInfo?.ipAddress,
        userAgent: requestInfo?.userAgent,
        metadata: {
          email: actor.email,
          reason: 'Contraseña incorrecta',
          location: data.location || requestInfo?.location || null,
        },
      });
    } catch (error) {
      // No fallar el login si el logging falla
    }
    throw new Error('Email o contraseña incorrectos');
  }

  const token = generateToken({
    id: actor.id,
    role: actor.role,
    primaryDid: actor.primaryDid,
    ethereumAddress: actor.ethereumAddress,
    polkadotAccountId: actor.polkadotAccountId,
  });

  // Registrar login exitoso
  try {
    await createAuditLog({
      actorId: actor.id,
      action: AuditAction.LOGIN,
      entityType: EntityType.ACTOR,
      entityId: actor.id,
      description: `Usuario ${actor.email} inició sesión exitosamente`,
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
      metadata: {
        email: actor.email,
        role: actor.role,
        location: data.location || requestInfo?.location || null,
      },
    });
  } catch (error) {
    // No fallar el login si el logging falla
  }

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
export async function registerUser(
  data: RegisterData,
  createdBy: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<AuthResponse> {
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

  // Registrar creación de usuario
  try {
    await createAuditLog({
      actorId: createdBy,
      action: AuditAction.USER_CREATED,
      entityType: EntityType.ACTOR,
      entityId: actor.id,
      description: `Usuario ${data.email} creado con rol ${data.role}`,
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
      metadata: {
        createdUserEmail: data.email,
        createdUserRole: data.role,
        createdUserName: data.name || null,
      },
    });
  } catch (error) {
    console.error('⚠️  Error registrando log de auditoría:', error);
  }

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
