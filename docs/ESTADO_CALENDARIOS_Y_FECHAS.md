# Estado Actual: Calendarios y Fechas en fidufi

## 📅 Resumen Ejecutivo

El sistema actualmente tiene **implementación parcial** de funcionalidades relacionadas con calendarios y fechas. Se han implementado las bases para fechas del fideicomiso y alertas de reuniones, pero faltan modelos y funcionalidades completas para gestión de calendarios.

---

## ✅ Lo que ESTÁ Implementado

### 1. Fechas del Fideicomiso (Trust)

**Modelo Prisma:**
```prisma
model Trust {
  constitutionDate       DateTime? // Fecha de constitución del contrato
  expirationDate         DateTime? // Fecha de vencimiento calculada
  maxTermYears           Int?      // Plazo máximo en años (30, 50, 70)
  termType               String?   // 'STANDARD' (30 años), 'FOREIGN' (50 años), 'DISABILITY' (70 años)
  terminationDate        DateTime?
  terminationType        String?   // 'EXPIRATION', 'CONDITION_MET', 'EARLY_TERMINATION'
  satRegisteredAt        DateTime? // Fecha de registro ante SAT
}
```

**Backend (`trustService.ts`):**
- ✅ Función `calculateTrustTimeline()` que calcula:
  - Tiempo transcurrido desde constitución
  - Tiempo restante hasta vencimiento
  - Estado (HEALTHY, WARNING, CRITICAL)
  - Alertas de vencimiento próximo

**Frontend:**
- ✅ Componente `TrustTimeline.tsx` que muestra:
  - Fecha de constitución
  - Fecha de vencimiento
  - Tiempo restante
  - Estado visual del plazo

### 2. Alertas de Reuniones del Comité Técnico

**Backend (`alertGenerationService.ts`):**
- ✅ Función `generateMeetingAlerts()` que:
  - Calcula próxima reunión (cada 3 meses desde creación)
  - Genera alertas 30 días antes
  - Genera alertas críticas 7 días antes
  - Notifica a Comité Técnico y Fiduciarios

**Limitaciones:**
- ⚠️ Solo calcula la próxima reunión, no gestiona un calendario completo
- ⚠️ No hay modelo para sesiones históricas o futuras
- ⚠️ No se pueden agendar reuniones extraordinarias
- ⚠️ No se pueden registrar actas de sesiones

### 3. Fechas en Otros Modelos

**Asset:**
- ✅ `registeredAt` - Fecha de registro del activo
- ✅ `anchoredAt` - Fecha de anclaje en blockchain

**FiduciarioFee:**
- ✅ `studyFeePaidAt` - Fecha de pago del honorario de estudio
- ✅ `lastUpdated` - Última actualización

**MonthlyFeePayment:**
- ✅ `paidAt` - Fecha de pago mensual
- ✅ `createdAt` - Fecha de creación del registro

**ActorTrust:**
- ✅ `assignedAt` - Fecha de asignación al fideicomiso
- ✅ `revokedAt` - Fecha de revocación

**AuditLog:**
- ✅ `createdAt` - Timestamp de la acción

---

## ❌ Lo que FALTA Implementar

### 1. Modelo de Sesiones del Comité Técnico

**Requisito según contrato:**
- Reuniones cada 3 meses (trimestrales)
- Reuniones extraordinarias cuando lo solicite cualquier miembro o el Fiduciario
- Requiere mayoría de miembros para validez
- Se debe levantar acta de cada reunión

**Modelo Propuesto:**
```prisma
model ComiteSession {
  id                String    @id @default(uuid())
  trustId           String
  trust             Trust     @relation(fields: [trustId], references: [trustId])
  
  sessionDate       DateTime
  sessionType       String    // 'QUARTERLY', 'EXTRAORDINARY', 'SPECIAL'
  
  // Asistencia
  attendees         String[]   // Array de Actor.id
  quorum            Boolean   // true si hay mayoría (2 de 3 miembros)
  
  // Agenda y decisiones
  agenda            Json?      // Items de la agenda
  decisions         Json?      // Decisiones tomadas
  approvedItems     String[]   // IDs de activos/presupuestos aprobados
  
  // Acta
  minutes           String?    // Texto del acta
  minutesUrl        String?    // URL del documento del acta
  minutesHash       String?    // Hash del documento para integridad
  
  // Estado
  status            String    // 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  
  // Organización
  scheduledBy       String?    // Actor.id que agendó la reunión
  location          String?    // Lugar de la reunión (presencial/virtual)
  meetingLink       String?    // Link para reunión virtual
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@index([trustId])
  @@index([sessionDate])
  @@index([status])
  @@index([sessionType])
}
```

**Funcionalidades Necesarias:**
- [ ] Endpoint para crear sesión (agendar reunión)
- [ ] Endpoint para actualizar sesión (agregar agenda, decisiones)
- [ ] Endpoint para registrar acta
- [ ] Endpoint para listar sesiones (pasadas y futuras)
- [ ] UI para calendario de reuniones
- [ ] UI para crear/editar sesiones
- [ ] UI para registrar actas

### 2. Modelo de Estados de Cuenta Mensuales

**Requisito según contrato:**
- El Fiduciario debe proporcionar estados de cuenta dentro de los primeros 10 días hábiles de cada mes
- El Comité Técnico tiene 10 días hábiles para hacer observaciones
- Si no hay observaciones, se aprueban tácitamente

**Modelo Propuesto:**
```prisma
model MonthlyStatement {
  id                String    @id @default(uuid())
  trustId           String
  trust             Trust     @relation(fields: [trustId], references: [trustId])
  
  // Período del estado de cuenta
  year              Int
  month             Int       // 1-12
  
  // Información del estado de cuenta
  statementDate     DateTime  // Fecha de emisión
  periodStart       DateTime  // Inicio del período
  periodEnd         DateTime  // Fin del período
  
  // Contenido
  summary           Json      // Resumen del patrimonio, activos, pasivos
  assets            Json      // Lista de activos al cierre del período
  transactions      Json?     // Transacciones del período
  
  // Documento
  documentUrl       String?   // URL del PDF del estado de cuenta
  documentHash      String?   // Hash del documento para integridad
  
  // Aprobación del Comité Técnico
  status            String    // 'PENDING', 'APPROVED', 'OBSERVED', 'TACITLY_APPROVED'
  submittedAt       DateTime  @default(now())
  reviewedAt        DateTime?
  reviewedBy        String?   // Actor.id del miembro del Comité que revisó
  observations      String?   // Observaciones del Comité
  
  // Auto-aprobación tácita (10 días hábiles sin observaciones)
  tacitlyApprovedAt DateTime?
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@unique([trustId, year, month])
  @@index([trustId])
  @@index([year, month])
  @@index([status])
  @@index([statementDate])
}
```

**Funcionalidades Necesarias:**
- [ ] Generación automática de estados de cuenta mensuales
- [ ] Endpoint para crear estado de cuenta
- [ ] Endpoint para aprobar/rechazar con observaciones
- [ ] Lógica de auto-aprobación tácita (10 días hábiles)
- [ ] UI para visualizar estados de cuenta
- [ ] UI para revisar y aprobar estados de cuenta (Comité Técnico)
- [ ] Alertas cuando falta generar estado de cuenta

### 3. Calendario Completo de Eventos

**Eventos que Deberían Aparecer:**
1. **Reuniones del Comité Técnico**
   - Trimestrales (programadas automáticamente)
   - Extraordinarias (agendadas manualmente)

2. **Estados de Cuenta Mensuales**
   - Fecha límite de emisión (día 10 hábil del mes)
   - Fecha límite de revisión (día 20 hábil del mes)
   - Auto-aprobación tácita (día 20 hábil + 10 días)

3. **Vencimientos de Activos**
   - Bonos gubernamentales
   - Préstamos hipotecarios
   - Otros activos con fecha de vencimiento

4. **Pagos de Honorarios**
   - Honorario mensual del fiduciario
   - Honorario de estudio (una vez)
   - Honorario de modificación (cuando aplica)

5. **Fechas Importantes del Fideicomiso**
   - Fecha de constitución
   - Fecha de vencimiento
   - Fecha de registro ante SAT

**Modelo Propuesto para Eventos:**
```prisma
model CalendarEvent {
  id                String    @id @default(uuid())
  trustId           String?
  trust             Trust?    @relation(fields: [trustId], references: [trustId])
  
  // Información del evento
  title             String
  description       String?
  eventType         String    // 'MEETING', 'STATEMENT_DUE', 'PAYMENT_DUE', 'ASSET_MATURITY', 'TRUST_MILESTONE'
  eventDate         DateTime
  endDate           DateTime? // Para eventos con duración
  
  // Relaciones opcionales
  relatedAssetId    String?   // Si está relacionado con un activo
  relatedSessionId  String?   // Si está relacionado con una sesión
  relatedStatementId String?  // Si está relacionado con un estado de cuenta
  
  // Notificaciones
  notifyDaysBefore  Int[]     // Array de días antes para notificar (ej: [30, 7, 1])
  notifiedAt        DateTime[] // Fechas en que se enviaron notificaciones
  
  // Estado
  status            String    // 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'OVERDUE'
  completedAt       DateTime?
  
  // Metadatos
  metadata          Json?     // Información adicional específica del tipo
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@index([trustId])
  @@index([eventDate])
  @@index([eventType])
  @@index([status])
}
```

**Funcionalidades Necesarias:**
- [ ] Generación automática de eventos recurrentes
- [ ] Endpoint para crear eventos manuales
- [ ] Endpoint para listar eventos (filtros por fecha, tipo, fideicomiso)
- [ ] UI de calendario mensual/semanal
- [ ] UI de vista de lista de eventos próximos
- [ ] Sistema de notificaciones basado en `notifyDaysBefore`

### 4. Alertas Basadas en Fechas

**Alertas Actuales:**
- ✅ Alertas de vencimiento del fideicomiso
- ✅ Alertas de reuniones del Comité Técnico
- ✅ Alertas de pagos pendientes

**Alertas Faltantes:**
- [ ] Alertas de estados de cuenta pendientes de generar
- [ ] Alertas de estados de cuenta pendientes de revisar
- [ ] Alertas de vencimientos de activos específicos
- [ ] Recordatorios de reuniones (30, 7, 1 día antes)
- [ ] Alertas de fechas límite de aprobación tácita

---

## 🎯 Plan de Implementación Sugerido

### Fase 1: Sesiones del Comité Técnico (Prioridad Alta)

1. **Backend:**
   - Crear modelo `ComiteSession` en Prisma
   - Migración de base de datos
   - Endpoints CRUD para sesiones
   - Servicio para calcular próximas reuniones trimestrales

2. **Frontend:**
   - Componente de calendario de reuniones
   - Formulario para crear/editar sesiones
   - Vista de sesiones pasadas y futuras
   - Formulario para registrar actas

### Fase 2: Estados de Cuenta Mensuales (Prioridad Alta)

1. **Backend:**
   - Crear modelo `MonthlyStatement` en Prisma
   - Migración de base de datos
   - Servicio para generar estados de cuenta automáticamente
   - Endpoints para crear, revisar, aprobar estados de cuenta
   - Lógica de auto-aprobación tácita

2. **Frontend:**
   - Vista de lista de estados de cuenta
   - Visualización de estado de cuenta (PDF o HTML)
   - Formulario de revisión para Comité Técnico
   - Alertas de estados de cuenta pendientes

### Fase 3: Calendario Completo (Prioridad Media)

1. **Backend:**
   - Crear modelo `CalendarEvent` en Prisma
   - Servicio para generar eventos automáticos
   - Endpoints para gestionar eventos
   - Sistema de notificaciones basado en fechas

2. **Frontend:**
   - Componente de calendario mensual
   - Vista de lista de eventos próximos
   - Filtros por tipo de evento y fideicomiso
   - Integración con dashboards

### Fase 4: Mejoras y Optimizaciones (Prioridad Baja)

1. Exportación de calendarios (iCal, Google Calendar)
2. Recordatorios por email
3. Dashboard de eventos próximos
4. Reportes de cumplimiento de fechas

---

## 📊 Estado Actual vs. Requerimientos del Contrato

| Requerimiento | Estado Actual | Completitud |
|--------------|--------------|-------------|
| Fechas de constitución y vencimiento | ✅ Implementado | 100% |
| Timeline del fideicomiso | ✅ Implementado | 100% |
| Alertas de vencimiento | ✅ Implementado | 100% |
| Reuniones trimestrales del Comité | ⚠️ Parcial (solo alertas) | 30% |
| Sesiones del Comité con actas | ❌ No implementado | 0% |
| Estados de cuenta mensuales | ❌ No implementado | 0% |
| Aprobación tácita de estados | ❌ No implementado | 0% |
| Calendario completo de eventos | ❌ No implementado | 0% |
| Vencimientos de activos | ⚠️ Parcial (solo alertas) | 40% |

---

## 🔍 Archivos Relevantes Actuales

### Backend:
- `api/prisma/schema.prisma` - Modelo Trust con fechas
- `api/src/services/trustService.ts` - `calculateTrustTimeline()`
- `api/src/services/alertGenerationService.ts` - `generateMeetingAlerts()`

### Frontend:
- `app/src/components/trust/TrustTimeline.tsx` - Visualización de timeline
- `app/src/pages/TrustPage.tsx` - Página de detalles del fideicomiso

---

## 💡 Recomendaciones Inmediatas

1. **Empezar con Sesiones del Comité Técnico** - Es crítico según el contrato y relativamente simple de implementar
2. **Luego Estados de Cuenta Mensuales** - También crítico y requerido por el contrato
3. **Finalmente Calendario Completo** - Mejora la UX pero no es crítico para cumplimiento

¿Quieres que proceda con la implementación de alguna de estas funcionalidades?
