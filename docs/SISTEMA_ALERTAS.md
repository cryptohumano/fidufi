# Sistema de Alertas Avanzado - fidufi

## Resumen

El sistema de alertas avanzado permite generar notificaciones proactivas sobre eventos críticos relacionados con el fideicomiso, incluyendo vencimientos, pagos pendientes, límites de inversión, y otros eventos importantes.

## Tipos de Alertas

### 1. Alertas de Vencimiento (`EXPIRATION`)

Alertas generadas cuando un activo o documento está próximo a vencer o ha vencido.

**Subtipos:**
- `BOND_MATURITY`: Vencimiento de bonos gubernamentales
- `LOAN_MATURITY`: Vencimiento de préstamos hipotecarios
- `INSURANCE_EXPIRY`: Vencimiento de seguros (vida, incendio)
- `DOCUMENT_EXPIRY`: Vencimiento de documentos legales

**Campos específicos:**
- `expirationDate`: Fecha de vencimiento
- `daysUntilExpiration`: Días restantes hasta el vencimiento
- `assetId`: ID del activo relacionado (opcional)

**Ejemplo:**
```json
{
  "type": "EXPIRATION",
  "subtype": "BOND_MATURITY",
  "message": "Bono gubernamental vence en 30 días",
  "severity": "warning",
  "expirationDate": "2026-03-01T00:00:00Z",
  "daysUntilExpiration": 30,
  "assetId": "uuid-del-activo"
}
```

### 2. Alertas de Pagos (`PAYMENT`)

Alertas relacionadas con pagos pendientes o próximos a vencer.

**Subtipos:**
- `FIDUCIARIO_FEE_DUE`: Honorarios del fiduciario pendientes
- `MONTHLY_FEE_DUE`: Pago mensual de honorarios próximo a vencer
- `LOAN_PAYMENT_DUE`: Pago mensual de préstamo próximo a vencer
- `INSURANCE_PAYMENT_DUE`: Pago de seguro próximo a vencer

**Campos específicos:**
- `dueDate`: Fecha de vencimiento del pago
- `amount`: Monto a pagar
- `paymentType`: Tipo de pago
- `trustId`: ID del fideicomiso (para honorarios)
- `assetId`: ID del activo (para pagos de préstamos/seguros)

**Ejemplo:**
```json
{
  "type": "PAYMENT",
  "subtype": "MONTHLY_FEE_DUE",
  "message": "Pago mensual de honorarios vence en 5 días",
  "severity": "warning",
  "dueDate": "2026-02-05T00:00:00Z",
  "amount": "1500.00",
  "paymentType": "MONTHLY_FEE",
  "trustId": "10045"
}
```

### 3. Alertas de Cumplimiento (`COMPLIANCE`)

Alertas relacionadas con el cumplimiento de reglas de inversión (ya implementadas).

**Subtipos:**
- `RULE_VIOLATION`: Incumplimiento de reglas (ya implementado)
- `LIMIT_APPROACHING`: Acercamiento a límites de inversión
- `LIMIT_EXCEEDED`: Exceso de límites de inversión
- `EXCEPTION_PENDING`: Excepción pendiente de revisión (ya implementado)

**Campos específicos:**
- `ruleName`: Nombre de la regla afectada
- `currentValue`: Valor actual
- `limitValue`: Valor límite
- `percentage`: Porcentaje utilizado

**Ejemplo:**
```json
{
  "type": "COMPLIANCE",
  "subtype": "LIMIT_APPROACHING",
  "message": "Inversión en bonos alcanza el 28% del patrimonio (límite: 30%)",
  "severity": "warning",
  "ruleName": "BOND_LIMIT",
  "currentValue": "19180000.00",
  "limitValue": "20550000.00",
  "percentage": 28.0
}
```

### 4. Alertas de Reuniones (`MEETING`)

Alertas relacionadas con reuniones del Comité Técnico.

**Subtipos:**
- `COMITE_MEETING_DUE`: Reunión del Comité Técnico próxima (cada 3 meses según contrato)
- `MEETING_REMINDER`: Recordatorio de reunión próxima

**Campos específicos:**
- `meetingDate`: Fecha de la reunión
- `meetingType`: Tipo de reunión
- `trustId`: ID del fideicomiso

**Ejemplo:**
```json
{
  "type": "MEETING",
  "subtype": "COMITE_MEETING_DUE",
  "message": "Reunión del Comité Técnico programada para el 15 de febrero",
  "severity": "info",
  "meetingDate": "2026-02-15T10:00:00Z",
  "meetingType": "QUARTERLY",
  "trustId": "10045"
}
```

### 5. Alertas de Documentos (`DOCUMENT`)

Alertas relacionadas con documentos faltantes o próximos a vencer.

**Subtipos:**
- `DOCUMENT_MISSING`: Documento requerido faltante
- `DOCUMENT_EXPIRING`: Documento próximo a vencer
- `DOCUMENT_EXPIRED`: Documento vencido

**Campos específicos:**
- `documentType`: Tipo de documento
- `expirationDate`: Fecha de vencimiento (si aplica)
- `assetId`: ID del activo relacionado (opcional)

**Ejemplo:**
```json
{
  "type": "DOCUMENT",
  "subtype": "DOCUMENT_EXPIRING",
  "message": "Seguro de vida del préstamo hipotecario vence en 15 días",
  "severity": "warning",
  "documentType": "LIFE_INSURANCE",
  "expirationDate": "2026-02-15T00:00:00Z",
  "assetId": "uuid-del-activo"
}
```

## Estructura de Datos

### Modelo Alert (Extendido)

El modelo `Alert` actual se mantiene, pero se extiende con campos adicionales almacenados en JSON:

```prisma
model Alert {
  id                String    @id @default(uuid())
  assetId           String?
  asset             Asset?    @relation(fields: [assetId], references: [id])
  
  actorId           String    // Actor que debe recibir la alerta
  actor             Actor     @relation(fields: [actorId], references: [id])
  
  message           String
  severity          String    // "warning", "error", "info", "critical"
  
  // Nuevos campos para alertas avanzadas
  alertType         String?   // "EXPIRATION", "PAYMENT", "COMPLIANCE", "MEETING", "DOCUMENT"
  alertSubtype      String?   // Subtipo específico (ej. "BOND_MATURITY", "FIDUCIARIO_FEE_DUE")
  metadata          Json?     // Datos adicionales específicos del tipo de alerta
  
  acknowledged      Boolean   @default(false)
  acknowledgedAt    DateTime?
  
  createdAt         DateTime  @default(now())
  
  @@index([assetId])
  @@index([actorId])
  @@index([acknowledged])
  @@index([alertType])
  @@index([alertSubtype])
}
```

## Servicio de Alertas Avanzado

### Funcionalidades

1. **Generación Automática de Alertas**
   - Cron job o scheduler que ejecuta verificaciones periódicas
   - Verifica vencimientos, pagos pendientes, límites, etc.
   - Genera alertas automáticamente

2. **Verificación de Vencimientos**
   - Escanea activos con fechas de vencimiento
   - Genera alertas según umbrales configurables (ej. 30 días antes)

3. **Verificación de Pagos**
   - Verifica honorarios del fiduciario pendientes
   - Verifica pagos mensuales de préstamos
   - Genera alertas de recordatorio

4. **Verificación de Límites**
   - Monitorea porcentajes de inversión
   - Genera alertas cuando se acerca a límites (ej. 28% de bonos)

5. **Programación de Reuniones**
   - Calcula fechas de reuniones del Comité Técnico (cada 3 meses)
   - Genera recordatorios

## Endpoints Propuestos

### GET /api/alerts/advanced
Lista alertas avanzadas con filtros por tipo y subtipo.

**Query params:**
- `alertType`: Tipo de alerta (opcional)
- `alertSubtype`: Subtipo de alerta (opcional)
- `severity`: Severidad (opcional)
- `acknowledged`: Boolean (opcional)
- `limit`, `offset`: Paginación

### POST /api/alerts/generate
Genera alertas manualmente (útil para testing o generación bajo demanda).

**Body:**
```json
{
  "alertType": "EXPIRATION",
  "alertSubtype": "BOND_MATURITY",
  "trustId": "10045",
  "assetId": "uuid-del-activo"
}
```

### PUT /api/alerts/:id/acknowledge
Ya implementado - marca alerta como leída.

## Implementación

### Fase 1: Extender Schema
- Agregar campos `alertType`, `alertSubtype`, `metadata` al modelo `Alert`
- Crear migración de Prisma

### Fase 2: Servicio de Generación
- Crear `alertGenerationService.ts`
- Implementar funciones para cada tipo de alerta
- Implementar verificaciones periódicas

### Fase 3: Scheduler/Cron
- Configurar tarea programada (cron job o similar)
- Ejecutar verificaciones diarias o según configuración

### Fase 4: Frontend
- Actualizar UI para mostrar diferentes tipos de alertas
- Agregar filtros por tipo y subtipo
- Mejorar visualización con iconos y colores según tipo

## Configuración

### Umbrales Configurables

```typescript
const ALERT_THRESHOLDS = {
  EXPIRATION: {
    WARNING_DAYS: 30,      // Alertar 30 días antes del vencimiento
    CRITICAL_DAYS: 7,      // Alertar 7 días antes (crítico)
  },
  PAYMENT: {
    WARNING_DAYS: 7,       // Alertar 7 días antes del vencimiento
    CRITICAL_DAYS: 3,      // Alertar 3 días antes (crítico)
  },
  COMPLIANCE: {
    LIMIT_WARNING_PERCENT: 0.90,  // Alertar al 90% del límite
    LIMIT_CRITICAL_PERCENT: 0.95, // Alertar al 95% del límite
  },
};
```

## Notas

- Las alertas de cumplimiento ya están implementadas en `assetService.ts`
- Las alertas de excepciones pendientes ya están implementadas
- Este sistema extiende las capacidades existentes sin romper compatibilidad
- Las alertas se pueden filtrar y agrupar por tipo para mejor UX
