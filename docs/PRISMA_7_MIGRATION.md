# Migración a Prisma 7

Este documento explica los cambios realizados para migrar a Prisma 7.

## Cambios en Prisma 7

Según la [documentación oficial de Prisma 7](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7), los principales cambios son:

1. **Configuración de conexión movida**: La URL de conexión ahora se configura en `prisma.config.ts` en lugar de `schema.prisma`
2. **Nuevo archivo de configuración**: Se crea `prisma.config.ts` para la configuración
3. **Uso de `env()` helper**: Se usa `env()` de `prisma/config` en lugar de `process.env`

## Cambios Realizados

### 1. Actualización de Versiones

**Archivo**: `api/package.json`

```json
{
  "dependencies": {
    "@prisma/client": "^7.3.0"  // Actualizado de ^5.19.0
  },
  "devDependencies": {
    "prisma": "^7.3.0"  // Actualizado de 5.19.0
  }
}
```

### 2. Nuevo Archivo de Configuración

**Archivo**: `api/prisma.config.ts` (NUEVO)

```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

### 3. Actualización del Schema

**Archivo**: `api/prisma/schema.prisma`

**Antes** (Prisma 5):
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Después** (Prisma 7):
```prisma
datasource db {
  provider = "postgresql"
  // La URL de conexión ahora se configura en prisma.config.ts
}
```

## Instalación

Después de actualizar los archivos, ejecuta:

```bash
cd api
npm install
npx prisma generate
npx prisma migrate dev --name add_fiduciario_fees
```

## Referencias

- [Prisma 7 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- [Prisma Config Reference](https://www.prisma.io/docs/orm/reference/prisma-config-reference)
- [Prisma ORM Documentation](https://www.prisma.io/docs/orm)
