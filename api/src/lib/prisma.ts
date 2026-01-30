/**
 * Cliente de Prisma
 * 
 * Singleton pattern para evitar múltiples instancias de PrismaClient
 * en desarrollo con hot-reload
 * 
 * Prisma 7 requiere un adapter para PostgreSQL
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Asegurarse de que DATABASE_URL esté definido
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || typeof databaseUrl !== 'string') {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

// Crear adapter de Prisma para PostgreSQL pasando connectionString directamente
// Esto evita problemas con el parsing del Pool
const adapter = new PrismaPg({ 
  connectionString: String(databaseUrl),
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
