# Plan de Ejecución - fidufi

## 📋 Resumen Ejecutivo

Este documento explica cómo entendemos ejecutar el proyecto fidufi basado en el Plan de Acción Técnico y la estructura que hemos creado.

## ✅ Lo que Hemos Estructurado

### 1. Estructura del Proyecto

```
fidufi/
├── api/                    # Backend Node.js + Express + Prisma
│   ├── src/
│   │   ├── rules/         # ✅ Reglas de negocio implementadas
│   │   │   ├── investmentRules.ts  # Límites 30%/70%
│   │   │   └── mortgageRules.ts     # Reglas préstamos hipotecarios
│   │   └── index.ts       # ✅ Servidor Express básico
│   └── prisma/
│       └── schema.prisma  # ✅ Modelos completos (Actor, Asset, Trust, Alert, etc.)
├── app/                    # Frontend Vite + React PWA
│   └── src/
│       └── App.tsx        # ✅ Estructura básica
└── docs/                   # ✅ Documentación técnica
```

### 2. Modelo de Datos (Prisma)

Hemos definido los siguientes modelos:

- ✅ **Actor**: Usuarios del sistema con soporte multi-identidad (DID, Ethereum, Polkadot, PoP)
- ✅ **Asset**: Activos registrados con validación de cumplimiento
- ✅ **Trust**: Configuración de fideicomisos (límites, patrimonio inicial)
- ✅ **Alert**: Sistema de alertas por incumplimiento
- ✅ **RuleModification**: Historial de cambios en reglas

### 3. Reglas de Negocio Implementadas

#### ✅ Reglas de Inversión (`investmentRules.ts`)
- Límite 30% para bonos gubernamentales
- Límite 70% para otros activos
- Validación determinista y auditable

#### ✅ Reglas de Préstamos Hipotecarios (`mortgageRules.ts`)
- Validación de precio (≤ 10 × salario mínimo anual)
- Validación de plazo (10-20 años)
- Validación de seguros requeridos (vida + hipoteca)

### 4. Configuración Base

- ✅ TypeScript configurado para backend y frontend
- ✅ Prisma schema completo
- ✅ Docker Compose para PostgreSQL
- ✅ Estructura de carpetas según arquitectura
- ✅ Documentación técnica inicial

## 🚀 Cómo Ejecutar el Proyecto

### Paso 1: Configurar Base de Datos

```bash
# Levantar PostgreSQL con Docker
docker-compose up -d

# Verificar que está corriendo
docker ps | grep fidufi-postgres
```

### Paso 2: Configurar Backend

```bash
cd api

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores (DATABASE_URL, JWT_SECRET, etc.)

# Generar cliente de Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# (Opcional) Abrir Prisma Studio para ver la BD
npm run prisma:studio
```

### Paso 3: Iniciar Backend

```bash
# Modo desarrollo (con hot reload)
npm run dev

# El servidor estará en http://localhost:3001
# Health check: http://localhost:3001/health
```

### Paso 4: Configurar Frontend

```bash
cd app

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# La app estará en http://localhost:3000
```

## 📝 Próximos Pasos de Desarrollo

### Fase 1: Backend API (Prioridad Alta)

1. **Implementar servicios de negocio**
   - [ ] `assetService.ts`: Lógica de registro de activos
   - [ ] `trustService.ts`: Gestión de fideicomisos
   - [ ] `actorService.ts`: Gestión de actores y onboarding

2. **Implementar endpoints REST**
   - [ ] `POST /actors/onboard` - Registro de actor con multi-identidad
   - [ ] `POST /assets/register` - Registro de activo + validación
   - [ ] `GET /assets?trustId=10045` - Listado para auditores
   - [ ] `GET /trusts/:trustId` - Información del fideicomiso

3. **Implementar autenticación**
   - [ ] Middleware de autenticación JWT
   - [ ] Resolución de DID (didResolver.ts)
   - [ ] Integración con Aura Wallet

4. **Implementar servicios blockchain**
   - [ ] `vcIssuer.ts`: Generación de Verifiable Credentials
   - [ ] `blockchainService.ts`: Anclaje en Polygon zkEVM
   - [ ] Fallback a IPFS si es necesario

### Fase 2: Frontend PWA (Prioridad Media)

1. **Componentes base**
   - [ ] Instalar y configurar shadcn/ui
   - [ ] Crear componentes de UI reutilizables
   - [ ] Configurar tema y estilos

2. **Páginas principales**
   - [ ] Página de onboarding multi-identidad
   - [ ] Formulario de registro de activo
   - [ ] Panel de auditoría (solo lectura)
   - [ ] Dashboard de alertas

3. **Integración wallet**
   - [ ] Integrar Web3Modal
   - [ ] Conexión con Aura Wallet
   - [ ] Firma de mensajes para autenticación

4. **Configuración PWA**
   - [ ] Service Worker
   - [ ] Manifest completo
   - [ ] Modo offline básico

### Fase 3: Integración y Testing (Prioridad Media-Baja)

1. **Testing**
   - [ ] Tests unitarios para reglas de negocio
   - [ ] Tests de integración para API
   - [ ] Tests E2E para flujos críticos

2. **Documentación**
   - [ ] API documentation (Swagger/OpenAPI)
   - [ ] Guía de usuario
   - [ ] Guía de desarrollo

## 🔍 Lo que Necesitamos del Contrato PDF

Para completar la implementación, necesitamos analizar el PDF del contrato para:

1. **Verificar reglas exactas**
   - Confirmar porcentajes exactos (30%/70%)
   - Verificar condiciones específicas de préstamos
   - Identificar otras reglas no mencionadas

2. **Cláusulas adicionales**
   - Reglas de honorarios del fiduciario (cómo se valida el pago)
   - Procedimientos del Comité Técnico
   - Requisitos de documentación

3. **Metadatos del contrato**
   - Fechas importantes
   - Montos exactos
   - Definiciones legales precisas

## 🎯 Entendimiento del Proyecto

### ¿Qué es fidufi?

fidufi es una **capa de cumplimiento técnico** que:

- ✅ **Valida reglas** económicas objetivas según el contrato
- ✅ **Genera evidencia auditable** anclada en blockchain
- ✅ **No reemplaza al fiduciario** (él sigue ejecutando instrucciones)
- ✅ **No custodia activos** (solo valida cumplimiento)
- ✅ **Actúa como tercero neutral** para auditoría y transparencia

### Flujo Principal

```
1. Fiduciario registra activo → Frontend PWA
2. Sistema valida reglas → Backend (investmentRules, mortgageRules)
3. Si cumple → Guarda en DB, genera VC, ancla hash
4. Si no cumple → Marca non-compliant, genera alerta, igual ancla prueba
5. Auditor puede consultar historial → Panel de auditoría
```

### Principios Clave

1. **Neutralidad**: No controla valor, solo ejecuta reglas
2. **Determinismo**: Reglas objetivas, resultados verificables
3. **Auditabilidad**: Todo queda registrado de forma inmutable
4. **Privacidad**: Datos sensibles nunca van on-chain

## 📊 Estado Actual

- ✅ Estructura del proyecto creada
- ✅ Modelos de datos definidos
- ✅ Reglas de negocio implementadas (básicas)
- ✅ Configuración base lista
- ⏳ Pendiente: Análisis completo del PDF del contrato
- ⏳ Pendiente: Implementación de endpoints y servicios
- ⏳ Pendiente: Frontend completo

## 🎓 Conclusión

Hemos estructurado el proyecto según el Plan de Acción Técnico. La base está lista para comenzar el desarrollo. **Necesitamos el PDF del contrato** para:

1. Verificar y completar las reglas de negocio
2. Identificar cláusulas adicionales
3. Asegurar que la implementación sea fiel al contrato legal

Una vez tengamos el contrato, podemos:
- Ajustar las reglas si es necesario
- Agregar validaciones adicionales
- Completar la implementación de servicios y endpoints
