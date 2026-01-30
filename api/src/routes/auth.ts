/**
 * Routes para autenticación (login, registro)
 */

import { Router } from 'express';
import { login, registerUser } from '../services/authService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

/**
 * POST /auth/login
 * Login con email y contraseña
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const result = await login({ email, password });
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * POST /auth/register
 * Registro de nuevo usuario (solo Super Admin)
 */
router.post('/register', authenticate, authorize(ActorRole.SUPER_ADMIN), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { email, password, name, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, contraseña y rol son requeridos' });
    }

    const result = await registerUser(
      { email, password, name, role },
      req.user.actorId
    );
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
