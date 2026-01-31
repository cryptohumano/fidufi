# Propuesta: Sistema de Umbrales para Aprobación Automática de Excepciones

## 📋 Contexto Actual

Actualmente, **todas las excepciones** requieren aprobación manual del Comité Técnico:
- Cuando un activo no cumple las reglas → `NON_COMPLIANT`
- Si el Fiduciario solicita una excepción → `PENDING_REVIEW` (requiere aprobación del Comité)
- El Comité Técnico debe revisar y aprobar/rechazar manualmente cada caso

## 🤔 ¿Es Necesario un Umbral?

### Argumentos a FAVOR de umbrales automáticos:

1. **Eficiencia Operativa**
   - Excepciones menores (< 1% de exceso) pueden ser rutinarias
   - Reduce carga de trabajo del Comité Técnico
   - Permite operaciones más ágiles

2. **Escalabilidad**
   - Con múltiples fideicomisos, el Comité podría verse sobrecargado
   - Excepciones menores son comunes en operaciones diarias

3. **Mejores Prácticas de Gobernanza**
   - Muchas organizaciones usan umbrales delegados
   - El Comité se enfoca en decisiones estratégicas, no operativas menores

### Argumentos en CONTRA de umbrales automáticos:

1. **Riesgo Legal**
   - El contrato establece que el Comité Técnico debe aprobar excepciones
   - Podría violar el espíritu del contrato si se automatiza completamente

2. **Responsabilidad y Trazabilidad**
   - Todas las excepciones deben estar documentadas y aprobadas
   - El Comité es responsable legalmente de las decisiones

3. **Acumulación de Excepciones Menores**
   - Varias excepciones pequeñas pueden sumar un problema grande
   - El Comité necesita visibilidad completa

## 💡 Propuesta: Sistema Híbrido con Umbrales Configurables

### Concepto

Implementar un sistema de **umbrales configurables por fideicomiso** que permita:

1. **Aprobación Automática** para excepciones menores (bajo umbral)
2. **Revisión Requerida** para excepciones mayores (sobre umbral)
3. **Configuración Flexible** por el Comité Técnico o Super Admin

### Umbrales Propuestos

#### Por Porcentaje de Exceso

```typescript
interface ExceptionThresholds {
  // Umbral para aprobación automática (porcentaje de exceso sobre el límite)
  autoApproveThresholdPercent: number; // Ej: 1% = excepciones hasta 1% sobre el límite se aprueban automáticamente
  
  // Umbral para alerta crítica (requiere revisión urgente)
  criticalThresholdPercent: number; // Ej: 5% = excepciones sobre 5% requieren revisión inmediata
  
  // Umbral por valor absoluto (MXN)
  autoApproveThresholdAmount: Decimal; // Ej: $100,000 = excepciones menores a $100k se aprueban automáticamente
  criticalThresholdAmount: Decimal; // Ej: $1,000,000 = excepciones mayores requieren revisión urgente
}
```

#### Ejemplos de Configuración

**Configuración Conservadora (Recomendada Inicialmente):**
- `autoApproveThresholdPercent: 0` → **Todas las excepciones requieren aprobación manual**
- `criticalThresholdPercent: 2` → Excepciones sobre 2% requieren alerta crítica

**Configuración Moderada:**
- `autoApproveThresholdPercent: 0.5` → Excepciones hasta 0.5% se aprueban automáticamente
- `autoApproveThresholdAmount: $50,000` → Excepciones menores a $50k se aprueban automáticamente
- `criticalThresholdPercent: 3` → Excepciones sobre 3% requieren revisión urgente

**Configuración Permisiva (Solo para fideicomisos con mucha actividad):**
- `autoApproveThresholdPercent: 1` → Excepciones hasta 1% se aprueban automáticamente
- `autoApproveThresholdAmount: $100,000` → Excepciones menores a $100k se aprueban automáticamente
- `criticalThresholdPercent: 5` → Excepciones sobre 5% requieren revisión urgente

### Flujo Propuesto

```
1. Fiduciario registra activo
   ↓
2. Sistema valida reglas automáticamente
   ↓
3a. Si cumple → COMPLIANT ✅
3b. Si no cumple → Calcular exceso
   ↓
4. Evaluar umbrales:
   ├─ Si exceso < autoApproveThreshold → EXCEPTION_APPROVED (automático) ✅
   ├─ Si exceso >= autoApproveThreshold y < criticalThreshold → PENDING_REVIEW ⏳
   └─ Si exceso >= criticalThreshold → PENDING_REVIEW (CRÍTICO) ⚠️
   ↓
5. Si es PENDING_REVIEW:
   ↓
6. Comité Técnico revisa (mayoría de votos)
   ↓
7a. Aprobado → EXCEPTION_APPROVED ✅
7b. Rechazado → NON_COMPLIANT ❌
```

### Implementación Técnica

#### 1. Extender Modelo `Trust` en Prisma

```prisma
model Trust {
  // ... campos existentes ...
  
  // Umbrales para aprobación automática de excepciones
  exceptionAutoApproveThresholdPercent Decimal? // Porcentaje de exceso permitido para auto-aprobación
  exceptionAutoApproveThresholdAmount   Decimal? // Monto absoluto (MXN) permitido para auto-aprobación
  exceptionCriticalThresholdPercent    Decimal? // Porcentaje de exceso que requiere revisión urgente
  exceptionCriticalThresholdAmount      Decimal? // Monto absoluto (MXN) que requiere revisión urgente
  
  // Configuración de umbrales
  exceptionThresholdsEnabled           Boolean  @default(false) // Habilitar/deshabilitar umbrales automáticos
}
```

#### 2. Modificar `registerAsset` para Evaluar Umbrales

```typescript
// En assetService.ts, después de validar reglas:

if (!isCompliant && trust.exceptionThresholdsEnabled) {
  // Calcular exceso
  const excessPercent = calculateExcessPercent(asset, trust);
  const excessAmount = calculateExcessAmount(asset, trust);
  
  // Evaluar umbrales
  const autoApprovePercent = trust.exceptionAutoApproveThresholdPercent?.toNumber() || 0;
  const autoApproveAmount = trust.exceptionAutoApproveThresholdAmount?.toNumber() || 0;
  
  if (excessPercent <= autoApprovePercent && excessAmount <= autoApproveAmount) {
    // Aprobación automática
    complianceStatus = ComplianceStatus.EXCEPTION_APPROVED;
    compliant = true;
    // Registrar log de aprobación automática
  } else {
    // Requiere revisión del Comité
    complianceStatus = ComplianceStatus.PENDING_REVIEW;
    compliant = false;
  }
} else if (!isCompliant) {
  // Sin umbrales: comportamiento actual (requiere aprobación manual)
  complianceStatus = ComplianceStatus.NON_COMPLIANT;
  compliant = false;
}
```

#### 3. Endpoint para Configurar Umbrales

```typescript
// PUT /api/trusts/:trustId/exception-thresholds
// Solo COMITE_TECNICO o SUPER_ADMIN puede configurar
```

## ⚖️ Recomendación

### Fase 1: Sin Umbrales Automáticos (Actual)
- **Mantener el comportamiento actual**: Todas las excepciones requieren aprobación manual
- **Razón**: Cumplir estrictamente con el contrato y establecer trazabilidad completa

### Fase 2: Umbrales Opcionales (Futuro)
- **Implementar umbrales configurables** pero **deshabilitados por defecto**
- **Permitir al Comité Técnico** habilitar y configurar umbrales según necesidad
- **Registrar todas las aprobaciones automáticas** en logs de auditoría
- **Notificar al Comité** de todas las aprobaciones automáticas (aunque sean automáticas)

### Ventajas de este Enfoque

1. **Cumplimiento Legal**: Por defecto, se mantiene el comportamiento del contrato
2. **Flexibilidad**: Los fideicomisos pueden optar por eficiencia si lo desean
3. **Trazabilidad**: Todas las excepciones (automáticas o manuales) quedan registradas
4. **Control**: El Comité mantiene control total sobre la configuración

## 📊 Ejemplo de Configuración Recomendada

Para el fideicomiso 10045 (Patrimonio: $68,500,000):

```json
{
  "exceptionThresholdsEnabled": false, // Deshabilitado por defecto
  "exceptionAutoApproveThresholdPercent": 0.5, // 0.5% de exceso = ~$342,500
  "exceptionAutoApproveThresholdAmount": 500000, // $500,000 MXN máximo
  "exceptionCriticalThresholdPercent": 2, // 2% de exceso = ~$1,370,000
  "exceptionCriticalThresholdAmount": 2000000 // $2,000,000 MXN crítico
}
```

**Interpretación:**
- Excepciones menores a 0.5% O menores a $500k → Aprobación automática
- Excepciones entre 0.5% y 2% O entre $500k y $2M → Revisión normal
- Excepciones mayores a 2% O mayores a $2M → Revisión urgente (CRÍTICO)

## ✅ Conclusión

**Recomendación**: **NO implementar umbrales automáticos inicialmente**, pero **sí preparar la arquitectura** para soportarlos en el futuro si el Comité Técnico lo requiere.

**Razones:**
1. El contrato establece que el Comité debe aprobar excepciones
2. Mejor establecer trazabilidad completa primero
3. Los umbrales pueden agregarse después sin cambiar la arquitectura base
4. Permite al Comité evaluar si realmente los necesita después de usar el sistema

**Alternativa**: Si el Comité Técnico necesita eficiencia operativa, se puede implementar un sistema de **"aprobación rápida"** donde un solo miembro del Comité puede aprobar excepciones menores (sin mayoría), pero aún requiere acción humana.
