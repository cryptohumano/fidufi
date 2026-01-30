/**
 * Utilidades para JWT (JSON Web Tokens)
 * 
 * Genera y verifica tokens JWT para autenticación basada en SSI
 */

import jwt from 'jsonwebtoken';
import { ActorRole } from '../generated/prisma/enums';

const JWT_SECRET = process.env.JWT_SECRET || 'fidufi-dev-secret-change-in-production';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as string;

export interface JWTPayload {
  actorId: string;
  role: ActorRole;
  primaryDid?: string;
  ethereumAddress?: string;
  polkadotAccountId?: string;
}

export interface ActorTokenData {
  id: string;
  role: ActorRole;
  primaryDid?: string | null;
  ethereumAddress?: string | null;
  polkadotAccountId?: string | null;
}

/**
 * Genera un JWT para un actor
 */
export function generateToken(actor: ActorTokenData): string {
  const payload: JWTPayload = {
    actorId: actor.id,
    role: actor.role,
    primaryDid: actor.primaryDid || undefined,
    ethereumAddress: actor.ethereumAddress || undefined,
    polkadotAccountId: actor.polkadotAccountId || undefined,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as any,
    issuer: 'fidufi-api',
    audience: 'fidufi-client',
  });
}

/**
 * Verifica y decodifica un JWT
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'fidufi-api',
      audience: 'fidufi-client',
    }) as JWTPayload;

    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    }
    throw new Error('Error al verificar token');
  }
}

/**
 * Extrae el token del header Authorization
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
