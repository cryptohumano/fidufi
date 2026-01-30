# fidufi API - Backend

Backend API para fidufi construido con Node.js, Express, TypeScript y Prisma 7.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ 
- PostgreSQL 16+
- Docker (opcional, para levantar PostgreSQL)

### Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Generar cliente de Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev
```

### Desarrollo

```bash
# Iniciar servidor en modo desarrollo
npm run dev

# El servidor estará en http://localhost:3001
```

## 📁 Estructura del Proyecto

```
api/
├── src/
│   ├── lib/
│   │   └── prisma.ts      # Cliente de Prisma (singleton)
│   ├── routes/            # Endpoints REST (pendiente)
│   ├── services/          # Lógica de negocio (pendiente)
│   ├── rules/             # Reglas de negocio ✅
│   │   ├── investmentRules.ts
│   │   ├── mortgageRules.ts
│   │   └── fiduciarioFeeRules.ts
│   └── index.ts           # Punto de entrada
├── prisma/
│   ├── schema.prisma      # Schema de Prisma
│   └── migrations/        # Migraciones de BD
└── prisma.config.ts       # Configuración de Prisma 7
```

## 🔧 Configuración

### Variables de Entorno

Copia `.env.example` a `.env` y configura:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/fidufi?schema=public"
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
```

### Prisma 7

Este proyecto usa **Prisma 7**, que tiene cambios importantes:

- ✅ La configuración de conexión está en `prisma.config.ts` (no en `schema.prisma`)
- ✅ Usa `env()` helper de `prisma/config` para variables de entorno
- ✅ Ver [docs/PRISMA_7_MIGRATION.md](../docs/PRISMA_7_MIGRATION.md) para más detalles

## 📊 Base de Datos

### Modelos Principales

- **Actor**: Usuarios del sistema (Fiduciario, Comité Técnico, Auditor, Regulador)
- **Asset**: Activos registrados en el fideicomiso
- **Trust**: Configuración del fideicomiso
- **FiduciarioFee**: Honorarios del fiduciario
- **Alert**: Alertas por incumplimiento
- **RuleModification**: Historial de cambios en reglas

### Comandos Útiles

```bash
# Generar cliente de Prisma
npm run prisma:generate

# Crear nueva migración
npm run prisma:migrate

# Abrir Prisma Studio (UI para BD)
npm run prisma:studio

# Resetear base de datos (⚠️ CUIDADO)
npx prisma migrate reset
```

## 🧪 Testing

```bash
npm test
```

## 📝 Scripts Disponibles

- `npm run dev` - Inicia servidor en modo desarrollo
- `npm run build` - Compila TypeScript a JavaScript
- `npm run start` - Inicia servidor en producción
- `npm run prisma:generate` - Genera cliente de Prisma
- `npm run prisma:migrate` - Ejecuta migraciones
- `npm run prisma:studio` - Abre Prisma Studio

## 🔐 Reglas de Negocio

Las reglas de negocio están implementadas en `src/rules/`:

- **investmentRules.ts**: Límites de inversión (30%/70%)
- **mortgageRules.ts**: Reglas para préstamos hipotecarios
- **fiduciarioFeeRules.ts**: Validación de honorarios del fiduciario

Ver [docs/REGLAS_NEGOCIO.md](../docs/REGLAS_NEGOCIO.md) para detalles completos.

## 📚 Documentación

- [Arquitectura](../docs/ARQUITECTURA.md)
- [Reglas de Negocio](../docs/REGLAS_NEGOCIO.md)
- [Análisis del Contrato](../docs/ANALISIS_CONTRATO_COMPLETO.md)
- [Migración a Prisma 7](../docs/PRISMA_7_MIGRATION.md)

## 🐛 Troubleshooting

### Error: "The datasource property `url` is no longer supported"

Esto significa que estás usando Prisma 7 pero el schema aún tiene la configuración antigua. Verifica que:

1. `prisma.config.ts` existe y tiene la configuración correcta
2. `schema.prisma` no tiene `url` en el datasource
3. Versiones de Prisma están actualizadas (`^7.3.0`)

### Error de conexión a base de datos

1. Verifica que PostgreSQL esté corriendo
2. Verifica `DATABASE_URL` en `.env`
3. Verifica que la base de datos exista

```bash
# Con Docker
docker-compose up -d postgres

# Verificar conexión
psql $DATABASE_URL -c "SELECT 1"
```

## 📄 Licencia

[Por definir]
