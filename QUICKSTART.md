# 🚀 Inicio Rápido - fidufi

Guía rápida para empezar a desarrollar.

## ⚡ Inicio Ultra Rápido (3 pasos)

```bash
# 1. Instalar dependencias
yarn install

# 2. Levantar base de datos
docker-compose up -d postgres

# 3. Iniciar desarrollo (ambos servidores)
yarn dev
```

¡Listo! 🎉

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📁 Estructura Simplificada

```
fidufi/
├── api/          ← Backend (puerto 3001)
├── app/          ← Frontend (puerto 3000)
└── docs/         ← Documentación
```

## 🔧 Configuración Inicial (Solo Primera Vez)

### Backend

```bash
cd api
cp .env.example .env
# Editar .env con DATABASE_URL
yarn prisma:generate
yarn prisma:migrate
```

### Frontend

```bash
cd app
yarn dlx shadcn@latest init
yarn dlx shadcn@latest add button card
```

## 🎯 Comandos Esenciales

```bash
# Desarrollo
yarn dev              # Ambos servidores
yarn workspace @fidufi/api dev    # Solo backend
yarn workspace @fidufi/app dev    # Solo frontend

# Base de datos
make db-up            # Levantar PostgreSQL
make db-studio        # Abrir Prisma Studio
make db-migrate       # Ejecutar migraciones
```

## ✅ Verificación

1. **Backend OK**: http://localhost:3001/health → `{"status":"ok"}`
2. **Frontend OK**: http://localhost:3000 → Página carga
3. **BD OK**: `make db-studio` → Se abre Prisma Studio

## 📚 Más Información

- [Guía Completa de Desarrollo](./GUIA_DESARROLLO.md)
- [Configuración de Yarn](./docs/YARN_SETUP.md)
- [Setup de Tailwind v4](./docs/YARN_TAILWIND_V4_SETUP.md)

---

**¿Problemas?** Revisa [GUIA_DESARROLLO.md](./GUIA_DESARROLLO.md) para troubleshooting.
