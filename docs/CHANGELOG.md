# Changelog - fidufi

Registro de cambios relevantes del proyecto. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [Unreleased] - 2026-02-21

### Añadido

#### Backend (API)

- **Sistema de consenso para Comité Técnico**
  - Campo `requiresConsensus` en modelo `Trust`: cuando es `true`, las excepciones requieren mayoría (2 de 3 miembros).
  - Modelo `ExceptionVote`: votaciones por activo (APPROVE/REJECT) con `voterId`, `assetId`, `trustId`, `reason`.
  - Servicio `exceptionVoteService`: votar, obtener estado de votación, resolución por mayoría o aprobación simple.
  - Rutas `POST/GET /api/exception-votes` y endpoints para estado de votación por activo.

- **Sistema de plantillas de activos**
  - Modelo `AssetTemplate`: plantillas por tipo de activo y fideicomiso (o globales) con `defaultFields` (JSON).
  - Servicio `assetTemplateService` y rutas `api/src/routes/assetTemplates.ts`.
  - Migración `20260131215542_add_asset_templates`.

- **Mejoras en Trust**
  - Campos de plazos y vigencia: `constitutionDate`, `expirationDate`, `maxTermYears`, `termType` (STANDARD/FOREIGN/DISABILITY).
  - Cálculo automático de `expirationDate` según constitución + plazo máximo.
  - Migración `20260221191217_add_trust_requires_consensus` para `requiresConsensus`.

#### Frontend (App)

- **Contexto de selección de fideicomiso**
  - `TrustSelectionContext`: selección global de fideicomiso con persistencia en `localStorage`.
  - Auto-selección cuando el usuario tiene un solo fideicomiso.
  - Integración en flujos de registro de activos y páginas que requieren fideicomiso.

- **Diálogo de aprobación de excepciones**
  - Información contextual del fideicomiso (resumen, métricas).
  - Modo consenso: lista de votaciones, estado (PENDING/APPROVED/REJECTED), votos a favor/en contra.
  - Botones diferenciados: "Confirmar Voto a Favor" / "Confirmar Rechazo" cuando aplica consenso.

- **Gestión de fideicomisos**
  - Formulario de creación con duración: `maxTermYears`, `termType`, `constitutionDate`, cálculo de `expirationDate`.
  - Checkbox `requiresConsensus` para exigir mayoría en excepciones.

- **Páginas y dashboards**
  - Uso de `TrustSelectionContext` en Assets, RegisterAsset, TrustsManagement, Alerts, AuditLogs, MonthlyStatements y dashboards por rol.

#### Documentación

- **docs/CAMBIOS_POST_REUNION.md**: prioridades post walkthrough del POC.
- **docs/ANALISIS_VALOR_Y_UX_FIDEICOMISOS.md**: análisis de valor y propuesta de UX (plazos, partes, fiscales, estados de cuenta).
- **docs/CHANGELOG.md**: este archivo.

### Cambiado

- **Lógica de estados de cumplimiento**
  - Clarificación PENDING_REVIEW vs NON_COMPLIANT: excepciones permitidas pasan a PENDING_REVIEW; rechazos o violaciones sin excepción a NON_COMPLIANT.

- **Registro de activos**
  - Integración con consenso: si el fideicomiso tiene `requiresConsensus`, el flujo de excepción pasa por votaciones y mayoría.

- **Servicios**
  - `assetService`: soporte para consenso y actualización de estado según votación.
  - `trustService`: creación con plazos, `expirationDate` y `requiresConsensus`.
  - `alertGenerationService`, `auditLogService`: alineados con nuevo flujo de excepciones.

### Técnico

- Prisma: nuevos modelos `ExceptionVote`, `AssetTemplate`; campo `Trust.requiresConsensus`.
- Migraciones: `20260131211639_add_consensus_system`, `20260131215542_add_asset_templates`, `20260221191217_add_trust_requires_consensus`.

---

## Referencia a documentos

- [Plan de implementación](PLAN_IMPLEMENTACION.md)
- [Cambios post-reunión](CAMBIOS_POST_REUNION.md)
- [Análisis de valor y UX](ANALISIS_VALOR_Y_UX_FIDEICOMISOS.md)
- [Resumen de implementación](RESUMEN_IMPLEMENTACION.md)
