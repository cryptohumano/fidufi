# Guía de Configuración Inicial - fidufi

Esta guía te ayudará a configurar el proyecto desde cero con Yarn, Tailwind CSS v4 y todas las últimas versiones.

## 📋 Prerrequisitos

- **Node.js 20+** (recomendado: LTS más reciente)
- **Corepack** (viene incluido con Node.js 16.9+)
- **PostgreSQL 16+** (para el backend)

## 🚀 Configuración Paso a Paso

### 1. Habilitar Corepack y Yarn

```bash
# Habilitar corepack (si no está habilitado)
corepack enable

# Preparar Yarn 4.5.0
corepack prepare yarn@4.5.0 --activate

# Verificar versión
yarn --version
# Debería mostrar: 4.5.0
```

### 2. Clonar e Instalar Dependencias

```bash
# Si clonas el repo
git clone <repo-url>
cd fidufi

# Instalar todas las dependencias (raíz + workspaces)
yarn install
```

### 3. Configurar Backend (API)

```bash
cd api

# Copiar archivo de ejemplo de variables de entorno
cp .env.example .env

# Editar .env con tus valores
# DATABASE_URL="postgresql://user:password@localhost:5432/fidufi?schema=public"

# Levantar PostgreSQL con Docker (opcional)
cd ..
docker-compose up -d postgres

# Generar cliente de Prisma
yarn prisma:generate

# Ejecutar migraciones
yarn prisma:migrate

# (Opcional) Abrir Prisma Studio
yarn prisma:studio
```

### 4. Configurar Frontend (App)

```bash
cd app

# Inicializar shadcn/ui (primera vez)
yarn dlx shadcn@latest init

# Esto te pedirá:
# - Estilo: new-york o default
# - Color base: neutral, slate, etc.
# - Modo oscuro: class
# - Ruta de componentes: src/components/ui
# - Utilidades CSS: src/lib/utils.ts

# Agregar componentes básicos
yarn dlx shadcn@latest add button
yarn dlx shadcn@latest add card
yarn dlx shadcn@latest add input
yarn dlx shadcn@latest add form
```

### 5. Iniciar Desarrollo

```bash
# Desde la raíz (inicia ambos servidores)
yarn dev

# O por separado:
# Terminal 1 - Backend
yarn workspace @fidufi/api dev

# Terminal 2 - Frontend
yarn workspace @fidufi/app dev
```

## ✅ Verificación

### Backend
- ✅ API corriendo en `http://localhost:3001`
- ✅ Health check: `http://localhost:3001/health`
- ✅ Prisma Studio: `yarn workspace @fidufi/api prisma:studio`

### Frontend
- ✅ App corriendo en `http://localhost:3000`
- ✅ Tailwind CSS v4 funcionando
- ✅ shadcn/ui componentes disponibles

## 📦 Comandos Útiles

### Yarn Workspaces

```bash
# Ejecutar comando en workspace específico
yarn workspace @fidufi/api <comando>
yarn workspace @fidufi/app <comando>

# Ejecutar comando en todos los workspaces
yarn workspaces foreach run <comando>

# Agregar dependencia a workspace específico
yarn workspace @fidufi/app add <paquete>
```

### Desarrollo

```bash
# Desarrollo (ambos)
yarn dev

# Build (ambos)
yarn build

# Tests (todos)
yarn test
```

### shadcn/ui

```bash
cd app

# Agregar componente
yarn dlx shadcn@latest add <component-name>

# Ver componentes disponibles
yarn dlx shadcn@latest add --help
```

## 🐛 Troubleshooting

### Error: "Yarn not found"

```bash
corepack enable
corepack prepare yarn@4.5.0 --activate
```

### Error: "Cannot find module '@tailwindcss/vite'"

```bash
cd app
yarn add -D @tailwindcss/vite tailwindcss
```

### Error: "Prisma schema validation"

Verifica que:
1. `prisma.config.ts` existe en `api/`
2. `DATABASE_URL` está configurada en `.env`
3. PostgreSQL está corriendo

### Error: "shadcn init not working"

Asegúrate de:
1. Estar en el directorio `app`
2. Tailwind CSS v4 esté instalado
3. `vite.config.ts` tenga el plugin de Tailwind

## 📚 Documentación Adicional

- [Guía de Yarn + Tailwind v4](./docs/YARN_TAILWIND_V4_SETUP.md)
- [Migración a Prisma 7](./docs/PRISMA_7_MIGRATION.md)
- [Análisis del Contrato](./docs/ANALISIS_CONTRATO_COMPLETO.md)
- [Reglas de Negocio](./docs/REGLAS_NEGOCIO.md)

## 🎯 Próximos Pasos

1. ✅ Configuración inicial completada
2. ⏳ Implementar servicios del backend
3. ⏳ Crear componentes de UI
4. ⏳ Integrar autenticación SSI
5. ⏳ Implementar registro de activos

---

**¿Problemas?** Revisa la documentación en `docs/` o abre un issue.
