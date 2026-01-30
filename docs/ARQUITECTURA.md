# Arquitectura de fidufi

## Visión General

fidufi es una **capa de cumplimiento técnico** que valida reglas económicas en fideicomisos irrevocables sin reemplazar al fiduciario ni custodiar activos.

## Principios de Diseño

1. **Neutralidad Económica**: La plataforma no controla, custodia ni administra el valor; solo ejecuta reglas.
2. **Determinismo y Auditabilidad**: Las reglas son objetivas y cada decisión queda registrada de forma verificable.
3. **Responsabilidad Limitada**: La empresa es responsable por la ejecución técnica, no por el riesgo financiero.

## Componentes Principales

### Backend (`/api`)

#### Responsabilidades
- Validación de reglas de negocio
- Gestión de identidad SSI
- Generación de Verifiable Credentials
- Anclaje de evidencia en blockchain
- API REST para frontend y auditores

#### Stack
- **Runtime**: Node.js + Express
- **Lenguaje**: TypeScript
- **ORM**: Prisma
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT con clave derivada de wallet SSI

#### Estructura de Carpetas
```
api/
├── src/
│   ├── routes/          # Endpoints REST
│   │   ├── actors.ts
│   │   ├── assets.ts
│   │   └── trusts.ts
│   ├── services/        # Lógica de negocio
│   │   ├── assetService.ts
│   │   ├── vcIssuer.ts
│   │   └── blockchainService.ts
│   ├── rules/           # Reglas de negocio
│   │   ├── investmentRules.ts
│   │   └── mortgageRules.ts
│   ├── utils/           # Utilidades
│   │   ├── didResolver.ts
│   │   └── jwt.ts
│   └── index.ts         # Punto de entrada
└── prisma/
    └── schema.prisma
```

### Frontend (`/app`)

#### Responsabilidades
- Interfaz de usuario para Fiduciario y Comité Técnico
- Onboarding multi-identidad
- Formulario de registro de activos
- Panel de auditoría (solo lectura)
- Integración con Aura Wallet

#### Stack
- **Build Tool**: Vite
- **Framework**: React + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Estado**: TanStack Query
- **Wallet**: Web3Modal + Aura Wallet
- **Formato**: PWA (offline-first)

#### Estructura de Carpetas
```
app/
├── src/
│   ├── components/      # Componentes reutilizables
│   │   ├── ui/         # Componentes shadcn/ui
│   │   └── forms/
│   ├── pages/          # Páginas/rutas
│   │   ├── Onboarding.tsx
│   │   ├── AssetRegistration.tsx
│   │   └── AuditPanel.tsx
│   ├── lib/            # Utilidades y configuraciones
│   │   ├── api.ts
│   │   └── wallet.ts
│   └── App.tsx
└── public/
```

### Blockchain Layer

#### Responsabilidades
- Anclaje inmutable de evidencia
- Verificación de integridad
- Auditoría pública

#### Implementación
- **Red Principal**: Polygon zkEVM (bajo costo, EVM compatible)
- **Fallback**: IPFS + timestamp en Ethereum L2
- **Formato**: Hash de Verifiable Credential + metadatos públicos

#### Privacidad
- **On-chain**: Solo hash + metadatos públicos (assetType, trustId, compliant)
- **Off-chain**: Datos sensibles (RFC, montos exactos) nunca van on-chain

## Flujo de Datos

### Registro de Activo

```
1. Usuario (Fiduciario) → Frontend
   ↓
2. Conexión con Aura Wallet → Resolución de DID
   ↓
3. Formulario de registro → POST /api/assets/register
   ↓
4. Backend valida reglas → investmentRules.ts, mortgageRules.ts
   ↓
5. Si cumple → Guarda en DB, genera VC, ancla hash
   Si no cumple → Marca non-compliant, genera alerta, igual ancla prueba
   ↓
6. Frontend muestra resultado → "Registro exitoso" o "Alerta: incumplimiento"
```

### Validación de Reglas

```
1. Recibe nuevo activo
   ↓
2. Obtiene activos existentes del fideicomiso
   ↓
3. Calcula porcentajes actuales
   ↓
4. Valida contra límites:
   - Límite 30% bonos (si es GovernmentBond)
   - Límite 70% otros (si es MortgageLoan, etc.)
   - Reglas específicas de préstamos hipotecarios
   ↓
5. Retorna resultado de cumplimiento
```

## Modelo de Datos

### Entidades Principales

- **Actor**: Usuarios del sistema (Fiduciario, Comité Técnico, Auditor, Regulador)
- **Asset**: Activos registrados en el fideicomiso
- **Trust**: Configuración del fideicomiso (límites, patrimonio inicial)
- **Alert**: Alertas generadas por incumplimiento
- **RuleModification**: Historial de modificaciones de reglas

### Relaciones

```
Actor 1:N Asset (registeredBy)
Asset 1:N Alert
Actor 1:N Alert
Actor 1:N RuleModification
```

## Seguridad

### Autenticación
- JWT firmado con clave derivada de wallet SSI
- Resolución de DID para verificar identidad
- Fallbacks: Ethereum address, Polkadot AccountId, PoP

### Autorización
- Roles: FIDUCIARIO, COMITE_TECNICO, AUDITOR, REGULADOR
- Endpoints protegidos por middleware de autenticación
- Auditor y Regulador: solo lectura

### Privacidad
- Datos sensibles nunca van on-chain
- Solo hashes y metadatos públicos se anclan
- Verifiable Credentials almacenados off-chain

## Escalabilidad

- Diseñado para múltiples fideicomisos (trustId como partición lógica)
- Base de datos con índices optimizados
- API REST stateless
- Frontend PWA para mejor rendimiento offline

## Próximos Pasos

1. Implementar servicios de DID resolver
2. Integrar generación de Verifiable Credentials
3. Implementar anclaje en Polygon zkEVM
4. Crear componentes de UI con shadcn/ui
5. Integrar Aura Wallet en frontend
6. Implementar tests unitarios y de integración
