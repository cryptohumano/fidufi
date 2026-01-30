/**
 * Routes para administración (solo Super Admin)
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';
import { hashPassword } from '../utils/password';
import { getAdminStats } from '../services/adminStatsService';

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
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) {
      updateData.role = role;
      updateData.isSuperAdmin = role === ActorRole.SUPER_ADMIN;
    }
    if (password) {
      updateData.passwordHash = await hashPassword(password);
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

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
