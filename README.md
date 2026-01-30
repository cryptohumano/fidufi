# fidufi - Capa de Cumplimiento Técnico para Fideicomisos Irrevocables

## 📋 Descripción

fidufi es una plataforma que actúa como **tercero neutral** para validar el cumplimiento de reglas económicas en fideicomisos irrevocables, sin reemplazar al fiduciario ni custodiar activos.

## 🎯 Objetivo del MVP

Implementar un flujo mínimo viable para registrar activos (bonos, préstamos hipotecarios, etc.) dentro de un fideicomiso, con:

- ✅ Identidad verificable del reportante (Fiduciario o Comité Técnico)
- ✅ Validación automática contra reglas económicas (ej. límite del 30% en bonos)
- ✅ Generación de evidencia auditable anclada en cadena
- ✅ Interfaz accesible como PWA para usuarios no cripto-nativos

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

## 🔐 Identidad y Privacidad

- **Identidad primaria**: DID W3C (did:kilt, did:polkadot)
- **Fallbacks**: Ethereum address, Polkadot AccountId, Proof of Personhood
- **Privacidad**: Solo se ancla hash + metadatos públicos on-chain

## 📝 Estado del Proyecto

- [x] Estructura base del proyecto
- [ ] Configuración de Prisma y modelos
- [ ] Implementación de reglas de negocio
- [ ] Backend API REST
- [ ] Frontend PWA
- [ ] Integración SSI y blockchain

## 📄 Licencia

[Por definir]
