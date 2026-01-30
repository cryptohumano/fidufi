# Guía de Desarrollo - fidufi

Esta guía explica la estructura del proyecto y cómo trabajar con el monorepo.

## 📁 Estructura del Proyecto

```
fidufi/                    # Raíz del monorepo
├── api/                   # Backend (equivalente a "backend")
│   ├── src/              # Código fuente del backend
│   │   ├── routes/       # Endpoints REST (pendiente)
│   │   ├── services/     # Lógica de negocio (pendiente)
│   │   ├── rules/        # Reglas de negocio ✅
│   │   └── lib/          # Utilidades (Prisma client)
│   ├── prisma/           # Schema y migraciones de BD
│   └── package.json      # Dependencias del backend
│
├── app/                   # Frontend (equivalente a "frontend")
│   ├── src/              # Código fuente del frontend
│   │   ├── components/   # Componentes React
│   │   ├── pages/       # Páginas/rutas
│   │   └── lib/         # Utilidades (utils.ts)
│   ├── public/          # Archivos estáticos
│   └── package.json     # Dependencias del frontend
│
├── docs/                 # Documentación del proyecto
├── docker-compose.yml    # Configuración de PostgreSQL
└── package.json         # Configuración del monorepo (workspaces)
```

## 🎯 Equivalencias

| Este Proyecto | Estructura Tradicional |
|---------------|------------------------|
| `api/` | `backend/` |
| `app/` | `frontend/` |
| Workspaces de Yarn | Monorepo con múltiples proyectos |

## 🚀 Inicio Rápido

### Opción 1: Iniciar Todo desde la Raíz (Recomendado)

```bash
# Desde la raíz del proyecto
yarn dev
```

Esto inicia ambos servidores:
- **Backend**: `http://localhost:3001`
- **Frontend**: `http://localhost:3000`

### Opción 2: Iniciar por Separado (Recomendado para Desarrollo)

**Terminal 1 - Backend:**
```bash
cd api
yarn dev
# Servidor corriendo en http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd app
yarn dev
# Servidor corriendo en http://localhost:3000
```

## 📋 Configuración Inicial (Primera Vez)

### 1. Configurar Base de Datos

```bash
# Levantar PostgreSQL con Docker
docker-compose up -d postgres

# Verificar que está corriendo
docker ps | grep fidufi-postgres
```

### 2. Configurar Backend

```bash
cd api

# Copiar variables de entorno
cp .env.example .env

# Editar .env con tus valores
# DATABASE_URL="postgresql://fidufi:fidufi_dev_password@localhost:5432/fidufi?schema=public"

# Generar cliente de Prisma
yarn prisma:generate

# Ejecutar migraciones
yarn prisma:migrate

# (Opcional) Abrir Prisma Studio para ver la BD
yarn prisma:studio
```

### 3. Configurar Frontend

```bash
cd app

# Inicializar shadcn/ui (solo primera vez)
yarn dlx shadcn@latest init

# Agregar componentes básicos
yarn dlx shadcn@latest add button card input
```

## 🛠️ Comandos Útiles

### Desde la Raíz

```bash
# Instalar todas las dependencias
yarn install

# Iniciar ambos servidores
yarn dev

# Build de ambos proyectos
yarn build

# Ejecutar tests en todos los workspaces
yarn test
```

### Backend (api/)

```bash
cd api

# Desarrollo
yarn dev                    # Inicia servidor en :3001

# Base de datos
yarn prisma:generate        # Genera cliente de Prisma
yarn prisma:migrate         # Ejecuta migraciones
yarn prisma:studio          # Abre Prisma Studio (UI para BD)

# Build
yarn build                  # Compila TypeScript
yarn start                  # Ejecuta build de producción
```

### Frontend (app/)

```bash
cd app

# Desarrollo
yarn dev                    # Inicia servidor en :3000

# Build
yarn build                  # Compila para producción
yarn preview                # Previsualiza build

# shadcn/ui
yarn dlx shadcn@latest add <component>  # Agregar componente
```

### Usando Workspaces (desde la raíz)

```bash
# Ejecutar comando en workspace específico
yarn workspace @fidufi/api dev
yarn workspace @fidufi/app dev

# Agregar dependencia a workspace específico
yarn workspace @fidufi/api add express
yarn workspace @fidufi/app add axios

# Ejecutar comando en todos los workspaces
yarn workspaces foreach run build
```

## 🔍 Verificación del Proyecto

### 1. Verificar Backend

```bash
# Terminal 1
cd api
yarn dev

# En otro terminal, verificar health check
curl http://localhost:3001/health
# Debería responder: {"status":"ok","timestamp":"..."}
```

### 2. Verificar Frontend

```bash
# Terminal 2
cd app
yarn dev

# Abrir navegador en http://localhost:3000
# Deberías ver la página de fidufi
```

### 3. Verificar Base de Datos

```bash
# Abrir Prisma Studio
cd api
yarn prisma:studio

# Se abrirá en http://localhost:5555
# Aquí puedes ver y editar datos directamente
```

## 📊 Puertos y URLs

| Servicio | Puerto | URL |
|----------|--------|-----|
| Frontend (Vite) | 3000 | http://localhost:3000 |
| Backend (Express) | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |
| Prisma Studio | 5555 | http://localhost:5555 |

## 🔄 Flujo de Desarrollo Típico

### 1. Iniciar Sesión de Desarrollo

```bash
# Terminal 1: Base de datos (si no está corriendo)
docker-compose up -d postgres

# Terminal 2: Backend
cd api
yarn dev

# Terminal 3: Frontend
cd app
yarn dev
```

### 2. Hacer Cambios

- **Backend**: Edita archivos en `api/src/`, Vite recarga automáticamente
- **Frontend**: Edita archivos en `app/src/`, Vite recarga automáticamente (HMR)

### 3. Ver Cambios

- Frontend: http://localhost:3000 (se actualiza automáticamente)
- Backend: http://localhost:3001/health (verifica que sigue corriendo)

## 🐛 Troubleshooting

### Error: "Port 3001 already in use"

```bash
# Encontrar proceso usando el puerto
lsof -i :3001
# O
netstat -tulpn | grep 3001

# Matar proceso
kill -9 <PID>
```

### Error: "Cannot connect to database"

```bash
# Verificar que PostgreSQL está corriendo
docker ps | grep postgres

# Si no está corriendo
docker-compose up -d postgres

# Verificar conexión
cd api
yarn prisma:studio  # Si abre, la conexión está bien
```

### Error: "Module not found"

```bash
# Reinstalar dependencias
yarn install

# O en workspace específico
cd api && yarn install
cd ../app && yarn install
```

### Frontend no se conecta al Backend

Verifica que:
1. Backend está corriendo en :3001
2. `vite.config.ts` tiene el proxy configurado:
   ```ts
   proxy: {
     '/api': {
       target: 'http://localhost:3001',
       changeOrigin: true,
     },
   }
   ```

## 📝 Scripts Disponibles

### Raíz (package.json)

```json
{
  "dev": "yarn dev:api & yarn dev:app",      // Inicia ambos
  "dev:api": "cd api && yarn dev",           // Solo backend
  "dev:app": "cd app && yarn dev",           // Solo frontend
  "build": "yarn workspace @fidufi/api build && yarn workspace @fidufi/app build"
}
```

### Backend (api/package.json)

```json
{
  "dev": "tsx watch src/index.ts",           // Desarrollo con hot reload
  "build": "tsc",                            // Compilar TypeScript
  "start": "node dist/index.js",            // Producción
  "prisma:generate": "prisma generate",     // Generar cliente Prisma
  "prisma:migrate": "prisma migrate dev",    // Migraciones
  "prisma:studio": "prisma studio"          // UI de BD
}
```

### Frontend (app/package.json)

```json
{
  "dev": "vite",                             // Desarrollo
  "build": "tsc && vite build",             // Build producción
  "preview": "vite preview"                 // Preview build
}
```

## 🎓 Próximos Pasos

1. ✅ Estructura del proyecto entendida
2. ✅ Backend y Frontend corriendo
3. ⏳ Implementar endpoints del backend
4. ⏳ Crear componentes de UI
5. ⏳ Conectar frontend con backend
6. ⏳ Implementar autenticación SSI

## 📚 Referencias

- [Vite Documentation](https://vite.dev)
- [Yarn Workspaces](https://yarnpkg.com/features/workspaces)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

---

**¿Preguntas?** Revisa la documentación en `docs/` o los READMEs de cada workspace.
