/**
 * Configuración de Prisma 7
 * 
 * En Prisma 7, la configuración de la conexión a la base de datos
 * se mueve del schema.prisma a este archivo prisma.config.ts
 * 
 * IMPORTANTE: Prisma 7 requiere cargar dotenv/config explícitamente
 * 
 * Referencia: https://www.prisma.io/docs/orm/reference/prisma-config-reference
 */

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Verificar que DATABASE_URL esté definida
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno. Verifica tu archivo .env');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx --env-file=.env prisma/seed.ts',
  },
  datasource: {
    adapter: 'postgresql',
    url: env('DATABASE_URL'),
  },
});
