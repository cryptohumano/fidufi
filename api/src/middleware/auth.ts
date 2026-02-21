/**
 * Middleware de autenticación y autorización
 * 
 * Verifica JWT y valida roles de actores
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JWTPayload } from '../utils/jwt';
import { ActorRole } from '../generated/prisma/enums';
import { prisma } from '../lib/prisma';

// Extender el tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & {
        actor?: {
          id: string;
          role: ActorRole;
          name: string | null;
          isSuperAdmin: boolean;
        };
      };
    }
  }
}

/**
 * Middleware de autenticación
 * Verifica el JWT y carga el actor en req.user
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({ error: 'Token de autenticación requerido' });
      return;
    }

    // Verificar token
    const payload = verifyToken(token);

    // Cargar actor desde la base de datos para asegurar que existe
    const actor = await prisma.actor.findUnique({
      where: { id: payload.actorId },
    });

    if (!actor) {
      res.status(401).json({ error: 'Actor no encontrado' });
      return;
    }

    // Verificar que el rol en el token coincide con el de la BD
    if (actor.role !== payload.role) {
      res.status(401).json({ error: 'Rol del token no coincide con el actor' });
      return;
    }

    // Agregar usuario al request
    req.user = {
      ...payload,
      actor: {
        id: actor.id,
        role: actor.role,
        name: actor.name,
        isSuperAdmin: actor.isSuperAdmin,
      },
    };

    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Error de autenticación' });
  }
}

/**
 * Middleware de autorización
 * Verifica que el actor tenga uno de los roles permitidos
 * Acepta un array de roles o múltiples argumentos separados
 */
export function authorize(...allowedRolesOrArray: (ActorRole | ActorRole[])[]): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    // Super Admin puede hacer todo
    const isSuperAdmin = req.user.actor?.isSuperAdmin || req.user.role === ActorRole.SUPER_ADMIN;
    if (isSuperAdmin) {
      next();
      return;
    }

    // Normalizar allowedRoles a un array plano
    let rolesArray: ActorRole[];
    if (allowedRolesOrArray.length === 1 && Array.isArray(allowedRolesOrArray[0])) {
      rolesArray = allowedRolesOrArray[0] as ActorRole[];
    } else {
      rolesArray = allowedRolesOrArray as ActorRole[];
    }
    // Equivalencias: solo FIDUCIARIO está en el enum; Admin/Operador se tratan como FIDUCIARIO
    if (rolesArray.includes(ActorRole.FIDUCIARIO)) {
      rolesArray = [...new Set([...rolesArray, ActorRole.FIDUCIARIO])];
    }

    if (!rolesArray.includes(req.user.role)) {
      res.status(403).json({
        error: 'No autorizado',
        required: rolesArray,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware para verificar que es Super Admin
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  const isSuperAdmin = req.user.actor?.isSuperAdmin || req.user.role === ActorRole.SUPER_ADMIN;
  if (!isSuperAdmin) {
    res.status(403).json({ error: 'Se requiere Super Admin' });
    return;
  }

  next();
}

/**
 * Middleware opcional de autenticación
 * Si hay token, carga el usuario; si no, continúa sin error
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // No hay token, continuar sin autenticación
      next();
      return;
    }

    // Intentar verificar y cargar usuario
    const payload = verifyToken(token);
    const actor = await prisma.actor.findUnique({
      where: { id: payload.actorId },
    });

    if (actor && actor.role === payload.role) {
      req.user = {
        ...payload,
        actor: {
          id: actor.id,
          role: actor.role,
          name: actor.name,
          isSuperAdmin: actor.isSuperAdmin,
        },
      };
    }

    next();
  } catch (error) {
    // Si falla la verificación, continuar sin autenticación
    next();
  }
}
