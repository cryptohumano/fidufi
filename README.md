# fidufi - Capa de Cumplimiento Técnico para Fideicomisos Irrevocables

## 📋 Descripción

fidufi es una plataforma que actúa como **tercero neutral** para validar el cumplimiento de reglas económicas en fideicomisos irrevocables, sin reemplazar al fiduciario ni custodiar activos.

## 🎯 Objetivo del MVP

Implementar un flujo mínimo viable para registrar activos (bonos, préstamos hipotecarios, etc.) dentro de un fideicomiso, con:

- ✅ Identidad verificable del reportante (Fiduciario o Comité Técnico)
- ✅ Validación automática contra reglas económicas (ej. límite del 30% en bonos)
- ✅ Generación de evidencia auditable anclada en cadena
- ✅ Interfaz accesible como PWA para usuarios no cripto-nativos
- ✅ Asociación de activos a beneficiarios específicos
- ✅ Dashboards personalizados por rol (Fiduciario, Comité Técnico, Auditor, Regulador, Beneficiario)
- ✅ Sistema de alertas inteligente por incumplimientos

## 🧾 Contexto Legal (Contrato 10045)

- **Fideicomitente y Fiduciario**: Banco del Ahorro Nacional (misma entidad)
- **Patrimonio inicial**: $68,500,000 MXN
- **Reglas de inversión**:
  - 30%: Bonos federales o instrumentos de renta fija
  - 70%: Valores aprobados por CNBV o vivienda social/préstamos bajo condiciones específicas
- **Gobernanza**: Comité Técnico (3 miembros, mayoría para decisiones)
- **Cláusula clave**: El fiduciario no verifica validez de instrucciones → solo las ejecuta
- **→ fidufi actúa como tercero neutral que sí valida reglas, sin reemplazar al fiduciario**

## 🏗️ Arquitectura

```
fidufi/
├── api/                  # Backend Node.js + Express
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── rules/        # Reglas de negocio
│   │   └── utils/        # Utilidades (DID resolver, VC issuer)
│   └── prisma/
│       └── schema.prisma
├── app/                  # Frontend Vite + React PWA
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
│   └── public/
└── docs/                 # Documentación técnica
```

## 🚀 Stack Tecnológico

### Backend
- Node.js + Express + TypeScript
- Prisma 7 ORM + PostgreSQL
- JWT con clave derivada de wallet SSI (Aura Wallet)

### Frontend
- **Vite 6** + **React 19** + TypeScript
- **Tailwind CSS v4** + **shadcn/ui**
- Web3Modal para integración con Aura Wallet
- PWA (offline-first)

### Gestión de Paquetes
- **Yarn 4.5.0** (Berry) con Corepack
- Workspaces para monorepo

### Blockchain
- Polygon zkEVM (anclaje de hashes)
- W3C Verifiable Credentials
- IPFS como fallback

## 📦 Instalación

### Prerrequisitos

- Node.js 20+
- Corepack habilitado (viene con Node.js 16.9+)
- PostgreSQL 16+ (para backend)

### Configurar Yarn

```bash
# Habilitar corepack
corepack enable

# Preparar Yarn 4.5.0
corepack prepare yarn@4.5.0 --activate
```

### Instalar Dependencias

```bash
# Instalar todas las dependencias (raíz y workspaces)
yarn install

# O instalar por workspace
cd api && yarn install
cd ../app && yarn install
```

### Configurar Backend

```bash
cd api
yarn prisma generate
yarn prisma migrate dev
```

### Configurar Frontend

```bash
cd app

# Inicializar shadcn/ui (primera vez)
yarn dlx shadcn@latest init

# Agregar componentes según necesites
yarn dlx shadcn@latest add button
yarn dlx shadcn@latest add card
```

### Iniciar Desarrollo

```bash
# Desde la raíz (inicia ambos)
yarn dev

# O por separado
yarn workspace @fidufi/api dev    # Backend en :3001
yarn workspace @fidufi/app dev    # Frontend en :3000
```

## 🔐 Autenticación y Autorización

### Autenticación Actual
- Email/password con JWT
- Hash de contraseñas con bcrypt
- Tokens JWT con expiración

### Autorización por Rol
- Middleware de autenticación y autorización
- Protección de rutas por rol
- Filtrado automático de datos según rol del usuario

### Identidad y Privacidad (Futuro)
- **Identidad primaria**: DID W3C (did:kilt, did:polkadot)
- **Fallbacks**: Ethereum address, Polkadot AccountId, Proof of Personhood
- **Privacidad**: Solo se ancla hash + metadatos públicos on-chain

## 🎭 Roles en el Sistema

### SUPER_ADMIN
- Acceso completo al sistema
- Gestión de usuarios y roles
- Estadísticas globales
- Puede registrar activos en cualquier fideicomiso

### FIDUCIARIO
- Registra activos en el sistema
- Asocia activos a beneficiarios específicos (préstamos hipotecarios, vivienda social)
- Recibe alertas por incumplimientos
- Ve todos los activos del fideicomiso
- Dashboard con resumen de activos y alertas

### COMITE_TECNICO
- Puede registrar activos
- Puede modificar límites de inversión
- Aprueba excepciones
- Ve todos los activos del fideicomiso
- Dashboard con estadísticas de cumplimiento

### AUDITOR
- Solo lectura
- Ve todos los activos y su cumplimiento
- Puede verificar evidencia en blockchain
- Dashboard con reportes de cumplimiento

### REGULADOR
- Solo lectura
- Verifica cumplimiento regulatorio
- Ve todos los activos del fideicomiso
- Dashboard con análisis de cumplimiento

### BENEFICIARIO
- Solo lectura de sus activos asociados
- Recibe alertas sobre activos asociados a su cuenta
- Dashboard personalizado con solo sus activos y alertas
- No puede registrar activos

> 📖 Ver [docs/CREDENCIALES_USUARIOS.md](docs/CREDENCIALES_USUARIOS.md) para credenciales de prueba y [docs/ASOCIACION_ACTIVOS_ROLES.md](docs/ASOCIACION_ACTIVOS_ROLES.md) para detalles de visibilidad por rol.

## 📝 Estado del Proyecto

### ✅ Completado

- [x] Estructura base del proyecto (monorepo con Yarn workspaces)
- [x] Configuración de Prisma 7 y modelos de datos
- [x] Implementación de reglas de negocio (inversión, préstamos hipotecarios, honorarios)
- [x] Backend API REST completo
- [x] Sistema de autenticación con JWT (email/password)
- [x] Frontend PWA con React + Vite + Tailwind CSS v4
- [x] Dashboards por rol (Fiduciario, Comité Técnico, Auditor, Regulador, Beneficiario, Super Admin)
- [x] Asociación de activos a beneficiarios específicos
- [x] Sistema de alertas inteligente
- [x] Filtrado automático de activos por rol
- [x] Migraciones de base de datos
- [x] Seed script con datos de prueba
- [x] Sistema de consenso para Comité Técnico (votaciones por excepción, mayoría 2 de 3)
- [x] Plantillas de activos por tipo (backend: AssetTemplate, servicio y rutas)
- [x] Contexto global de selección de fideicomiso (TrustSelectionContext) con auto-selección
- [x] Formulario de fideicomisos con duración (constitutionDate, maxTermYears, termType, expirationDate)
- [x] Diálogo de aprobación de excepciones con contexto del fideicomiso y estado de votaciones

### 🚧 En Desarrollo

- [ ] Integración SSI completa (DID resolver, VC issuer)
- [ ] Anclaje real en blockchain (Polygon zkEVM)
- [ ] Pruebas end-to-end
- [ ] Documentación de API completa
- [ ] Despliegue en producción

### 📋 Pendiente

- [ ] Integración con Aura Wallet
- [ ] Soporte para múltiples fideicomisos simultáneos
- [ ] Reportes avanzados de cumplimiento
- [ ] Exportación de datos para auditoría

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 20+
- PostgreSQL 16+
- Corepack habilitado (`corepack enable`)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/cryptohumano/fidufi.git
cd fidufi

# Instalar dependencias
yarn install

# Configurar variables de entorno
cp api/.env.example api/.env
cp app/.env.example app/.env
# Editar .env con tus credenciales de PostgreSQL

# Configurar base de datos
cd api
yarn prisma generate
yarn prisma migrate dev
yarn prisma db seed

# Iniciar desarrollo
cd ..
yarn dev
```

El backend estará en `http://localhost:3001` y el frontend en `http://localhost:3000`.

### Credenciales de Prueba

Ver [docs/CREDENCIALES_USUARIOS.md](docs/CREDENCIALES_USUARIOS.md) para credenciales de usuarios de prueba.

## 📚 Documentación

- [Changelog](docs/CHANGELOG.md) – Cambios recientes y estado actual
- [Guía de Desarrollo](GUIA_DESARROLLO.md)
- [Plan de Implementación](docs/PLAN_IMPLEMENTACION.md)
- [Cambios Post-Reunión](docs/CAMBIOS_POST_REUNION.md)
- [Asociación de Activos y Roles](docs/ASOCIACION_ACTIVOS_ROLES.md)
- [Arquitectura Multi-Fideicomiso](docs/ARQUITECTURA_MULTI_FIDEICOMISO.md)
- [API Documentation](api/API_DOCS.md)
- [Credenciales de Usuarios](docs/CREDENCIALES_USUARIOS.md)

## 🤝 Contribuir

Este es un proyecto en desarrollo activo. Las contribuciones son bienvenidas.

## 📄 Licencia

[Por definir]
