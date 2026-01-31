/**
 * Routes para administración (solo Super Admin)
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';
import { hashPassword } from '../utils/password';
import { getAdminStats } from '../services/adminStatsService';
import { createAuditLog, AuditAction, EntityType, extractRequestInfo } from '../services/auditLogService';

const router = Router();

// Todas las rutas requieren autenticación y ser Super Admin
router.use(authenticate);
router.use(requireSuperAdmin);

/**
 * GET /admin/stats
 * Obtiene estadísticas generales del sistema
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getAdminStats();
    // Serializar Decimal a string para JSON
    res.json({
      ...stats,
      totalCompliantAssetsValue: stats.totalCompliantAssetsValue.toString(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /admin/users
 * Lista todos los usuarios
 */
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.actor.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(users);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /admin/users
 * Crea un nuevo usuario
 */
router.post('/users', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { email, password, name, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, contraseña y rol son requeridos' });
    }

    // Verificar que el email no esté en uso
    const existing = await prisma.actor.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({ error: 'Este email ya está registrado' });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.actor.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        isSuperAdmin: role === ActorRole.SUPER_ADMIN,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        createdAt: true,
      },
    });

    // Registrar log de auditoría
    const requestInfo = extractRequestInfo(req);
    try {
      await createAuditLog({
        actorId: req.user.actorId,
        action: AuditAction.USER_CREATED,
        entityType: EntityType.ACTOR,
        entityId: user.id,
        description: `Usuario ${email} creado con rol ${role}`,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        metadata: {
          createdUserEmail: email,
          createdUserRole: role,
          createdUserName: name || null,
        },
      });
    } catch (error) {
      console.error('⚠️  Error registrando log de auditoría:', error);
    }

    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /admin/users/:id
 * Actualiza un usuario
 */
router.put('/users/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;
    const { name, email, role, password } = req.body;

    // Verificar que el usuario existe
    const existing = await prisma.actor.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No permitir eliminar el flag isSuperAdmin si es el único super admin
    if (existing.isSuperAdmin && role !== ActorRole.SUPER_ADMIN) {
      const superAdminCount = await prisma.actor.count({
        where: { isSuperAdmin: true },
      });
      if (superAdminCount === 1) {
        return res.status(400).json({ error: 'No se puede quitar el último Super Admin' });
      }
    }

    const updateData: any = {};
    const changes: string[] = [];
    if (name !== undefined && name !== existing.name) {
      updateData.name = name;
      changes.push(`nombre: ${existing.name || 'N/A'} → ${name}`);
    }
    if (email !== undefined && email !== existing.email) {
      updateData.email = email;
      changes.push(`email: ${existing.email || 'N/A'} → ${email}`);
    }
    if (role !== undefined && role !== existing.role) {
      updateData.role = role;
      updateData.isSuperAdmin = role === ActorRole.SUPER_ADMIN;
      changes.push(`rol: ${existing.role} → ${role}`);
    }
    if (password) {
      updateData.passwordHash = await hashPassword(password);
      changes.push('contraseña actualizada');
    }

    if (Object.keys(updateData).length === 0) {
      return res.json(existing);
    }

    const user = await prisma.actor.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        updatedAt: true,
      },
    });

    // Registrar log de auditoría
    const requestInfo = extractRequestInfo(req);
    try {
      const action = role !== undefined && role !== existing.role 
        ? AuditAction.USER_ROLE_CHANGED 
        : AuditAction.USER_UPDATED;
      
      await createAuditLog({
        actorId: req.user.actorId,
        action,
        entityType: EntityType.ACTOR,
        entityId: id,
        description: `Usuario ${existing.email} actualizado: ${changes.join(', ')}`,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        metadata: {
          updatedUserEmail: existing.email,
          changes,
          previousRole: existing.role,
          newRole: role || existing.role,
        },
      });
    } catch (error) {
      console.error('⚠️  Error registrando log de auditoría:', error);
    }

    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /admin/users/:id
 * Elimina un usuario (no puede eliminar Super Admin)
 */
router.delete('/users/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;

    const user = await prisma.actor.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No permitir eliminar Super Admin
    if (user.isSuperAdmin) {
      return res.status(400).json({ error: 'No se puede eliminar un Super Admin' });
    }

    await prisma.actor.delete({
      where: { id },
    });

    // Registrar log de auditoría
    const requestInfo = extractRequestInfo(req);
    try {
      await createAuditLog({
        actorId: req.user.actorId,
        action: AuditAction.USER_DELETED,
        entityType: EntityType.ACTOR,
        entityId: id,
        description: `Usuario ${user.email} eliminado`,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        metadata: {
          deletedUserEmail: user.email,
          deletedUserRole: user.role,
          deletedUserName: user.name || null,
        },
      });
    } catch (error) {
      console.error('⚠️  Error registrando log de auditoría:', error);
    }

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
