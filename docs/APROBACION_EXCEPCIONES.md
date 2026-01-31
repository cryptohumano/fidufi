# Aprobación de Excepciones - Comité Técnico

## Resumen

Según el **Contrato de Fideicomiso No. 10045** y la arquitectura del sistema fidufi, el **Comité Técnico** es el único rol autorizado para aprobar excepciones a las reglas de inversión establecidas.

## Estados de Cumplimiento

El sistema maneja los siguientes estados de cumplimiento (`ComplianceStatus`):

### 1. `COMPLIANT` (Cumpliente)
- **Descripción**: El activo cumple todas las reglas de inversión establecidas.
- **Acción requerida**: Ninguna, el activo puede proceder normalmente.
- **Quién lo establece**: Sistema automáticamente durante el registro.

### 2. `NON_COMPLIANT` (No Cumpliente)
- **Descripción**: El activo no cumple una o más reglas de inversión.
- **Acción requerida**: 
  - El activo queda marcado como no cumpliente.
  - Se generan alertas para Fiduciario, Comité Técnico y Beneficiarios (si aplica).
  - El activo puede ser corregido o rechazado.
- **Quién lo establece**: Sistema automáticamente durante el registro.

### 3. `PENDING_REVIEW` (Pendiente de Revisión)
- **Descripción**: El activo excede límites o no cumple reglas, pero requiere revisión del Comité Técnico antes de ser rechazado.
- **Acción requerida**: 
  - **El Comité Técnico debe revisar y decidir**:
    - Aprobar como excepción → Cambiar a `EXCEPTION_APPROVED`
    - Rechazar → Mantener como `NON_COMPLIANT`
- **Quién lo establece**: 
  - Sistema automáticamente cuando el activo excede límites pero tiene justificación.
  - O manualmente por el Fiduciario cuando solicita una excepción.

### 4. `EXCEPTION_APPROVED` (Excepción Aprobada)
- **Descripción**: El activo excede límites o no cumple reglas, pero fue aprobado como excepción por el Comité Técnico.
- **Acción requerida**: Ninguna, el activo está aprobado y puede proceder.
- **Quién lo establece**: **Solo el Comité Técnico** (requiere mayoría de votos según el contrato).
- **Requisitos**:
  - Mayoría de los miembros del Comité Técnico debe aprobar.
  - Se debe registrar quién aprobó y cuándo.
  - El activo se marca como `compliant: true` aunque técnicamente exceda límites.

## Flujo de Aprobación

```
1. Fiduciario registra activo
   ↓
2. Sistema valida reglas automáticamente
   ↓
3a. Si cumple → COMPLIANT ✅
3b. Si no cumple → NON_COMPLIANT o PENDING_REVIEW
   ↓
4. Si es PENDING_REVIEW:
   ↓
5. Comité Técnico revisa (mayoría de votos)
   ↓
6a. Aprobado → EXCEPTION_APPROVED ✅
6b. Rechazado → NON_COMPLIANT ❌
```

## Roles y Permisos

### Comité Técnico (`COMITE_TECNICO`)
- ✅ **Único rol autorizado** para aprobar excepciones
- ✅ Puede cambiar estado de `PENDING_REVIEW` a `EXCEPTION_APPROVED`
- ✅ Puede rechazar activos pendientes (cambiar a `NON_COMPLIANT`)
- ✅ Requiere mayoría de votos según el contrato (2 de 3 miembros)

### Fiduciario (`FIDUCIARIO`)
- ✅ Puede registrar activos
- ✅ Puede solicitar revisión (marcar como `PENDING_REVIEW`)
- ❌ **NO puede aprobar excepciones**

### Otros Roles
- ❌ **NO pueden aprobar excepciones**
- ✅ Pueden ver el estado de cumplimiento
- ✅ Pueden recibir alertas sobre activos no cumplientes

## Implementación Técnica

### Backend
- El servicio `assetService.ts` establece automáticamente `COMPLIANT` o `NON_COMPLIANT` durante el registro.
- Para establecer `PENDING_REVIEW` o `EXCEPTION_APPROVED`, se requiere una actualización manual del activo.
- **Pendiente**: Implementar endpoint para que el Comité Técnico apruebe/rechace excepciones.

### Base de Datos
- El campo `complianceStatus` en el modelo `Asset` almacena el estado actual.
- El campo `compliant` (boolean) indica si el activo puede proceder:
  - `true` para `COMPLIANT` y `EXCEPTION_APPROVED`
  - `false` para `NON_COMPLIANT` y `PENDING_REVIEW`

## Datos de Prueba (Seed)

El seed incluye activos con diferentes estados:

- **Activo 9**: `PENDING_REVIEW` - Bono que excede límite del 30%
- **Activo 10**: `EXCEPTION_APPROVED` - Fondo aprobado como excepción
- **Activo 11**: `NON_COMPLIANT` - Préstamo con plazo fuera de rango
- **Activo 12**: `PENDING_REVIEW` - Préstamo con condiciones especiales

## Próximos Pasos

1. Implementar endpoint `PUT /api/assets/:id/approve-exception` (solo Comité Técnico)
2. Implementar endpoint `PUT /api/assets/:id/reject-exception` (solo Comité Técnico)
3. Agregar registro de votos del Comité Técnico
4. Implementar UI para que el Comité Técnico apruebe/rechace excepciones
