# Plan de Implementación - Digitalización de Instrumentos Fiduciarios

## 📊 Estado Actual

### ✅ Completado

1. **Infraestructura Base**
   - ✅ Estructura del monorepo (api/ y app/)
   - ✅ Configuración de Yarn 4.5.0 + Corepack
   - ✅ Tailwind CSS v4 + shadcn/ui configurado
   - ✅ Prisma 7 + PostgreSQL configurado
   - ✅ Docker Compose para desarrollo

2. **Modelos de Datos**
   - ✅ Schema Prisma completo (Actor, Asset, Trust, Alert, FiduciarioFee, etc.)
   - ✅ Migraciones listas para ejecutar

3. **Reglas de Negocio**
   - ✅ `investmentRules.ts` - Límites 30%/70%
   - ✅ `mortgageRules.ts` - Reglas de préstamos hipotecarios
   - ✅ `fiduciarioFeeRules.ts` - Validación de honorarios
   - ✅ Análisis completo del Contrato 10045

4. **Frontend Base**
   - ✅ Vite 6 + React 19 configurado
   - ✅ shadcn/ui inicializado
   - ✅ Componentes básicos (button, card, input)

## 🎯 Próximos Pasos - Fase 1: Backend API

### Prioridad 1: Servicios de Negocio (Core)

#### 1.1 Trust Service
**Objetivo**: Gestionar fideicomisos y su configuración

**Tareas**:
- [ ] Crear `api/src/services/trustService.ts`
- [ ] Función `getTrust(trustId)` - Obtener configuración del fideicomiso
- [ ] Función `createTrust(data)` - Crear nuevo fideicomiso
- [ ] Función `updateTrustLimits(trustId, limits)` - Actualizar límites (solo Comité Técnico)
- [ ] Validar que el fideicomiso existe antes de operaciones

**Endpoint**: `GET /trusts/:trustId`

#### 1.2 Actor Service
**Objetivo**: Gestionar actores del sistema (Fiduciario, Comité Técnico, etc.)

**Tareas**:
- [ ] Crear `api/src/services/actorService.ts`
- [ ] Función `onboardActor(data)` - Registrar actor con multi-identidad
- [ ] Función `findActorByIdentity(identity)` - Buscar por DID/Ethereum/Polkadot
- [ ] Función `verifyActorRole(actorId, requiredRole)` - Verificar rol
- [ ] Validar que las identidades sean únicas

**Endpoint**: `POST /actors/onboard`

#### 1.3 Asset Service (CRÍTICO)
**Objetivo**: Lógica de registro de activos con validación de reglas

**Tareas**:
- [ ] Crear `api/src/services/assetService.ts`
- [ ] Función `registerAsset(data)` - Flujo completo de registro:
  1. Validar honorarios del fiduciario están pagados
  2. Obtener activos existentes del fideicomiso
  3. Aplicar reglas de inversión (investmentRules)
  4. Si es préstamo hipotecario, aplicar mortgageRules
  5. Determinar estado de cumplimiento
  6. Guardar en base de datos
  7. Generar alertas si no cumple
  8. Generar Verifiable Credential
  9. Anclar hash en blockchain
- [ ] Función `getAssets(trustId, filters)` - Listar activos para auditores
- [ ] Función `getAssetById(assetId)` - Obtener activo específico

**Endpoint**: `POST /assets/register`

### Prioridad 2: Endpoints REST

#### 2.1 Endpoints de Actores
- [ ] `POST /actors/onboard` - Registro de actor
- [ ] `GET /actors/me` - Obtener actor actual (autenticado)
- [ ] `GET /actors/:id` - Obtener actor por ID

#### 2.2 Endpoints de Activos
- [ ] `POST /assets/register` - Registrar activo (Fiduciario/Comité)
- [ ] `GET /assets` - Listar activos (con filtros: trustId, assetType, complianceStatus)
- [ ] `GET /assets/:id` - Obtener activo específico
- [ ] `GET /assets/:id/compliance` - Ver detalles de cumplimiento

#### 2.3 Endpoints de Fideicomisos
- [ ] `GET /trusts/:trustId` - Información del fideicomiso
- [ ] `GET /trusts/:trustId/summary` - Resumen (patrimonio, inversiones, cumplimiento)
- [ ] `PUT /trusts/:trustId/limits` - Actualizar límites (solo Comité Técnico)

#### 2.4 Endpoints de Alertas
- [ ] `GET /alerts` - Listar alertas del actor actual
- [ ] `PUT /alerts/:id/acknowledge` - Marcar alerta como leída

### Prioridad 3: Autenticación y Autorización

#### 3.1 Middleware de Autenticación
- [ ] Crear `api/src/middleware/auth.ts`
- [ ] Middleware `authenticate` - Verificar JWT
- [ ] Middleware `authorize(roles)` - Verificar roles permitidos
- [ ] Resolver identidad desde JWT (DID/Ethereum/Polkadot)

#### 3.2 Utilidades SSI
- [ ] Crear `api/src/utils/didResolver.ts`
- [ ] Función `resolveDID(did)` - Resolver DID a información
- [ ] Función `verifySignature(message, signature, did)` - Verificar firma
- [ ] Integración con Aura Wallet (preparar estructura)

#### 3.3 Generación de JWT
- [ ] Crear `api/src/utils/jwt.ts`
- [ ] Función `generateToken(actor)` - Generar JWT desde identidad SSI
- [ ] Función `verifyToken(token)` - Verificar y decodificar JWT

### Prioridad 4: Servicios Blockchain

#### 4.1 Verifiable Credentials
- [ ] Crear `api/src/services/vcIssuer.ts`
- [ ] Función `issueAssetVC(asset)` - Generar VC para activo registrado
- [ ] Estructura del VC según W3C estándar
- [ ] Firmar VC con clave del sistema

#### 4.2 Anclaje en Blockchain
- [ ] Crear `api/src/services/blockchainService.ts`
- [ ] Función `anchorHash(hash, metadata)` - Anclar en Polygon zkEVM
- [ ] Función `verifyAnchor(txHash)` - Verificar anclaje
- [ ] Fallback a IPFS si Polygon falla
- [ ] Guardar txHash y metadata en Asset

## 🎯 Flujo Principal de Registro de Activo

```
1. Usuario (Fiduciario) → Frontend
   ↓
2. Conexión con Aura Wallet → Resolución de DID
   ↓
3. Formulario de registro → POST /assets/register
   ↓
4. Backend valida:
   a. Autenticación (JWT válido)
   b. Honorarios pagados (fiduciarioFeeRules)
   c. Reglas de inversión (investmentRules)
   d. Reglas específicas (mortgageRules si aplica)
   ↓
5. Si cumple → COMPLIANT
   Si no cumple → NON_COMPLIANT + Alerta
   ↓
6. Guardar en DB (Asset)
   ↓
7. Generar VC (Verifiable Credential)
   ↓
8. Anclar hash en Polygon zkEVM
   ↓
9. Retornar respuesta al frontend
   ↓
10. Frontend muestra resultado
```

## 📋 Orden de Implementación Recomendado

### Sprint 1: Fundación del Backend (Semana 1)
1. ✅ Trust Service básico
2. ✅ Actor Service básico
3. ✅ Endpoints básicos (GET /trusts/:id, POST /actors/onboard)
4. ✅ Migraciones de Prisma ejecutadas
5. ✅ Seed data para Trust 10045

### Sprint 2: Registro de Activos (Semana 2)
1. ✅ Asset Service completo
2. ✅ POST /assets/register implementado
3. ✅ Integración de todas las reglas
4. ✅ Generación de alertas
5. ✅ Tests básicos de reglas

### Sprint 3: Autenticación (Semana 3)
1. ✅ Middleware de autenticación
2. ✅ JWT con SSI
3. ✅ Protección de endpoints
4. ✅ Resolución de DID básica

### Sprint 4: Blockchain (Semana 4)
1. ✅ Generación de VC
2. ✅ Anclaje en Polygon zkEVM
3. ✅ Verificación de anclajes
4. ✅ Fallback a IPFS

### Sprint 5: Frontend Core (Semana 5)
1. ✅ Página de onboarding
2. ✅ Formulario de registro de activo
3. ✅ Integración con backend
4. ✅ Manejo de errores y validaciones

### Sprint 6: Frontend Avanzado (Semana 6)
1. ✅ Panel de auditoría
2. ✅ Dashboard de alertas
3. ✅ Integración con Aura Wallet
4. ✅ PWA completo

## 🚀 Comenzar Ahora

**Siguiente paso inmediato**: Implementar Trust Service y Actor Service básicos, luego el flujo completo de registro de activos.

¿Empezamos con la implementación del Trust Service y Actor Service?
