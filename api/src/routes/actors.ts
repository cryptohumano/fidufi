/**
 * Routes para gestión de actores
 */

import { Router } from 'express';
import {
  onboardActor,
  findActorByIdentity,
  getActorById,
  listActors,
} from '../services/actorService';
import { authenticate } from '../middleware/auth';
import { generateToken } from '../utils/jwt';

const router = Router();

/**
 * POST /actors/onboard
 * Registra un nuevo actor con multi-identidad y retorna JWT
 */
router.post('/onboard', async (req, res) => {
  try {
    const actor = await onboardActor(req.body);
    
    // Generar JWT para el nuevo actor
    const token = generateToken({
      id: actor.id,
      role: actor.role,
      primaryDid: actor.primaryDid,
      ethereumAddress: actor.ethereumAddress,
      polkadotAccountId: actor.polkadotAccountId,
    });
    
    res.status(201).json({
      actor,
      token,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /actors/me
 * Obtiene el actor actual (requiere autenticación)
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const actor = await getActorById(req.user.actorId);
    // Asegurar que isSuperAdmin esté incluido en la respuesta
    res.json({
      ...actor,
      isSuperAdmin: actor.isSuperAdmin || actor.role === 'SUPER_ADMIN',
    });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /actors/:id
 * Obtiene un actor por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const actor = await getActorById(id);
    res.json(actor);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /actors
 * Lista todos los actores (con filtros opcionales)
 */
router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    const actors = await listActors({
      role: role as any,
    });
    res.json(actors);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /actors/find
 * Busca un actor por identidad (DID, Ethereum, Polkadot)
 */
router.post('/find', async (req, res) => {
  try {
    const { type, value } = req.body;
    const actor = await findActorByIdentity({ type, value });
    
    if (!actor) {
      return res.status(404).json({ error: 'Actor no encontrado' });
    }
    
    res.json(actor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
