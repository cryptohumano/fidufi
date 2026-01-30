# Solución de Problemas con Prisma 7

## Problema: "client password must be a string"

Este error ocurre cuando Prisma 7 no puede cargar correctamente las variables de entorno desde `.env`.

## Solución Aplicada

### 1. Cargar dotenv/config en prisma.config.ts

```typescript
import 'dotenv/config'; // ← IMPORTANTE: Cargar antes de usar env()
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    adapter: 'postgresql',
    url: env('DATABASE_URL'),
  },
});
```

### 2. Usar connectionString directamente en PrismaPg

En lugar de usar un `Pool` de `pg`, pasar `connectionString` directamente:

```typescript
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ 
  connectionString: String(process.env.DATABASE_URL),
});
```

### 3. Cargar dotenv/config PRIMERO en seed.ts

```typescript
// Cargar variables de entorno PRIMERO (antes de cualquier import)
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ 
  connectionString: String(process.env.DATABASE_URL),
});
```

### 4. Ejecutar seed con --env-file

```bash
# En package.json
"prisma:seed": "tsx --env-file=.env prisma/seed.ts"

# O ejecutar directamente
tsx --env-file=.env prisma/seed.ts
```

## Configuración Completa

### prisma.config.ts
```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    adapter: 'postgresql',
    url: env('DATABASE_URL'),
  },
});
```

### src/lib/prisma.ts
```typescript
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ 
  connectionString: String(process.env.DATABASE_URL),
});

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
```

### prisma/seed.ts
```typescript
import 'dotenv/config'; // PRIMERO

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ 
  connectionString: String(process.env.DATABASE_URL),
});

const prisma = new PrismaClient({ adapter });
```

## Verificación

```bash
# 1. Verificar que DATABASE_URL está cargada
cd api
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"

# 2. Ejecutar seed
yarn prisma:seed

# 3. Verificar que funciona
yarn dev
```

## Referencias

- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- [Prisma PostgreSQL Adapter](https://www.prisma.io/docs/orm/overview/databases/postgresql)
