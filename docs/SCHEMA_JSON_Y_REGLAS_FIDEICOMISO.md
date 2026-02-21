# Relación: Schema Prisma, JSON de registro y reglas de negocio

Este documento describe cómo el **schema de Prisma**, el **JSON de especificación por tipo** (`REGISTRO_FIDEICOMISO_POR_TIPO.json`) y las **reglas de negocio** se alinean y dónde se aplica cada una.

---

## 1. ¿El schema de Prisma ajusta al JSON?

**Sí.** El modelo `Trust` y la tabla `TrustType` cubren todos los campos del JSON. La diferencia es que el schema es **único** (una sola tabla `Trust` con todos los campos) y el JSON **describe por tipo** qué campos son **requeridos** o **relevantes**. En la base de datos todo se guarda en las mismas columnas; la **lógica por tipo** decide qué validar y qué mostrar.

### Mapeo directo (Schema ↔ JSON)

| JSON (especificación)        | Prisma (Trust / TrustType)     | Notas |
|-----------------------------|---------------------------------|-------|
| `trustId`                   | `Trust.trustId`                 | Único, auto si no se envía. |
| `name`                      | `Trust.name`                    | |
| `trustTypeId`               | `Trust.trustTypeId` → `TrustType.id` | FK; obligatorio en creación. |
| `baseCurrency`              | `Trust.baseCurrency`           | Default `'ARS'` en schema y en API. |
| `initialCapital`            | `Trust.initialCapital`         | Decimal; en Construcción se persiste 0 o presupuesto según lógica. |
| `bondLimitPercent` / `otherLimitPercent` | `Trust.bondLimitPercent`, `Trust.otherLimitPercent` | Default 30/70 en schema; **relevantes para FINANCIERO**. |
| `trustTypeConfig`           | `Trust.trustTypeConfig`         | JSON; Construcción: `{ presupuestoTotal }`. |
| `constitutionDate`, `maxTermYears`, `termType` | `Trust.constitutionDate`, `maxTermYears`, `termType` | |
| `fechaFirma`, `lugarFirma`, `jurisdiccion`, `domicilioLegal`, `domicilioFiscal` | Mismos nombres en `Trust` | ONBOARDING. |
| `objetoTexto`, `finalidadCategoria` | `Trust.objetoTexto`, `Trust.finalidadCategoria` | |
| `fechaObjetivoEntrega`       | `Trust.fechaObjetivoEntrega`    | Especialmente relevante para Construcción. |
| `reglasExtincionResumen`    | `Trust.reglasExtincionResumen`  | |
| `reportPeriodicity`, `requiresConsensus` | `Trust.reportPeriodicity`, `Trust.requiresConsensus` | |
| Tipos (CONSTRUCCION, etc.)   | `TrustType.code`                | Definidos en seed; `TrustType.rulesConfig` describe reglas por tipo. |

Campos del JSON que no están en el schema como columnas propias no existen (ej. el JSON no añade campos nuevos; solo exige/opcionaliza los que ya están en Prisma).

---

## 2. Dónde vive cada “regla” en la base de datos y en el código

### 2.1 Estructura de datos (Prisma)

| Capa | Qué define | Dónde |
|------|------------|--------|
| **Tipos de fideicomiso** | Códigos (CONSTRUCCION, FINANCIERO, ADMINISTRATIVO), nombres, reglas declarativas | Tabla `TrustType`; seed en `api/prisma/migrations/.../migration.sql` (INSERT TrustType). |
| **Reglas por tipo (declarativas)** | Qué exige cada tipo (presupuesto, patrimonio, hitos, etc.) | `TrustType.rulesConfig` (JSON). Ej. Construcción: `presupuestoTotalRequired`, `requiresMilestones`; Financiero: `initialCapitalRequired`, `bondLimitPercent`, `otherLimitPercent`. |
| **Campos de onboarding por tipo** | Lista de campos sugeridos para la UI por tipo | `TrustType.onboardingFieldsSchema` (JSON array). Ej. Construcción: name, presupuestoTotal, fechaObjetivoEntrega, baseCurrency, objetoTexto, finalidadCategoria. |
| **Datos del fideicomiso** | Valores concretos (montos, fechas, texto, etc.) | Tabla `Trust`: columnas y `Trust.trustTypeConfig` (JSON tipo-específico). |

El **schema** no “sabe” por sí solo que Construcción requiere `presupuestoTotal` y Financiero `initialCapital`; eso se implementa en **servicios y rutas** usando `TrustType.code` y, si hace falta, `TrustType.rulesConfig`.

### 2.2 Reglas de negocio (validación y persistencia)

| Regla | Dónde se aplica | Comportamiento |
|-------|------------------|----------------|
| **trustTypeId obligatorio** | `api/src/routes/trusts.ts` (POST crear) | Si falta → 400 con mensaje “trustTypeId es requerido”. |
| **baseCurrency siempre definida** | `api/src/routes/trusts.ts` | Se normaliza a `'ARS'` si no se envía; se pasa `normalizedBaseCurrency` a `createTrust`. |
| **Construcción: presupuestoTotal obligatorio** | `api/src/services/trustService.ts` → `createTrust()` | Si `trustTypeCode === 'CONSTRUCCION'`: exige `trustTypeConfig.presupuestoTotal` > 0; si no → Error. |
| **Construcción: initialCapital puede ser 0** | `api/src/services/trustService.ts` → `createTrust()` | Si es Construcción y `initialCap <= 0` pero hay `presupuestoTotal`, usa `presupuestoTotal` como valor a guardar en `initialCapital` (para consistencia interna) y guarda `trustTypeConfig` con `presupuestoTotal`. |
| **Financiero/Administrativo: initialCapital > 0** | `api/src/services/trustService.ts` → `createTrust()` | Si no es Construcción: exige `initialCapital` numérico > 0; si no → Error. |
| **Defaults 30/70 para límites** | `api/src/services/trustService.ts` → `createTrust()` | Si no se envían `bondLimitPercent`/`otherLimitPercent`, se guardan 30 y 70 (Decimal) en `Trust`. |

Ninguna de estas validaciones está en el schema de Prisma; el schema solo define tipos y nullability. Las restricciones “por tipo” vienen del **código** (ruta + `trustService`), alineado con el JSON de especificación.

### 2.3 Reglas de inversión (límites 30% / 70%)

| Regla | Dónde se aplica | Comportamiento |
|-------|------------------|----------------|
| **Límite bonos (bondLimitPercent)** | `api/src/rules/investmentRules.ts` → `validateBondLimit()` | Usa `Trust.initialCapital` y `Trust.bondLimitPercent` (default 30). Aplica a **registro de activos** en fideicomisos de inversión. |
| **Límite otros activos (otherLimitPercent)** | `api/src/rules/investmentRules.ts` → `validateOtherAssetsLimit()` | Usa `Trust.initialCapital` y `Trust.otherLimitPercent` (default 70). |

Estas reglas tienen sentido sobre todo para tipo **FINANCIERO** (patrimonio inicial + límites). Para **CONSTRUCCION** el “monto de referencia” para presupuesto/hitos es `trustTypeConfig.presupuestoTotal`; `initialCapital` en BD puede coincidir con ese valor por cómo se persiste en `createTrust`, pero la lógica de negocio de obra no usa los porcentajes 30/70.

### 2.4 Auditoría

| Qué se registra | Dónde | Relación con el JSON |
|-----------------|--------|------------------------|
| **Metadata del evento TRUST_CREATED** | `api/src/routes/trusts.ts` (después de `createTrust`) | Se arma según **tipo**: común (trustId, name, trustTypeId, trustTypeCode, baseCurrency); **CONSTRUCCION** → `trustTypeConfig`; **FINANCIERO** → initialCapital, bondLimitPercent, otherLimitPercent. Coincide con los “ejemplosRegistroAuditoria” del JSON. |

---

## 3. Flujo resumido: desde el JSON hasta la base de datos

1. **JSON** define qué datos son **requeridos/relevantes por tipo** (Construcción, Financiero, Administrativo).
2. **Ruta POST** exige `trustTypeId` y normaliza `baseCurrency`; el resto lo recibe y pasa al servicio.
3. **trustService.createTrust**:
   - Resuelve `TrustType` por `trustTypeId` y obtiene `code`.
   - Según `code`: valida Construcción (presupuestoTotal) o Financiero/Administrativo (initialCapital > 0), y decide qué escribir en `initialCapital` y en `trustTypeConfig`.
   - Persiste en **Prisma** (tabla `Trust` + creación de `FiduciarioFee`).
4. **Schema Prisma** no valida “por tipo”; solo almacena los valores que el servicio escribe.
5. **Reglas de inversión** (`investmentRules`) usan `Trust.initialCapital` y `Trust.bondLimitPercent`/`otherLimitPercent` cuando se registran activos (típico en Financiero).
6. **Auditoría** refleja en metadata los datos “correctos” por tipo (según el mismo criterio del JSON).

En conjunto: el **schema** es el contrato de almacenamiento; el **JSON** es el contrato de qué pedir y qué considerar por tipo; las **reglas de negocio** están en rutas, `trustService` y `investmentRules`, y hacen que lo que se pide (JSON) y lo que se guarda (schema) sean coherentes.
