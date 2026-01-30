# ¿Qué es fidufi?

## 🎯 Resumen Ejecutivo

**fidufi es una plataforma de cumplimiento técnico** que valida automáticamente que los activos registrados en un fideicomiso cumplan con las reglas económicas definidas en el contrato fiduciario.

## 🔍 ¿Qué Problema Resuelve?

En un fideicomiso tradicional:
- El **Fiduciario** ejecuta instrucciones sin verificar si cumplen las reglas del contrato
- No hay validación automática de límites de inversión
- Es difícil auditar el cumplimiento de reglas
- No hay evidencia inmutable de las decisiones

**fidufi resuelve esto** actuando como un **tercero neutral** que:
- ✅ Valida automáticamente las reglas antes de registrar activos
- ✅ Genera evidencia auditable anclada en blockchain
- ✅ Notifica cuando hay incumplimientos
- ✅ No reemplaza al fiduciario (él sigue ejecutando)

## 🏛️ Contexto: Contrato 10045

El sistema está diseñado para el **Contrato de Fideicomiso No. 10045** del Banco del Ahorro Nacional:

- **Patrimonio inicial**: $68,500,000 MXN
- **Regla principal**: 
  - 30% máximo en bonos gubernamentales
  - 70% máximo en otros activos (préstamos hipotecarios, valores CNBV, etc.)
- **Gobernanza**: Comité Técnico (3 miembros)

## 🔄 ¿Cómo Funciona?

### Flujo Principal

```
1. Fiduciario quiere registrar un activo
   ↓
2. Completa formulario en fidufi (PWA)
   ↓
3. fidufi valida automáticamente:
   - ¿Los honorarios están pagados?
   - ¿El activo cumple con los límites del 30%/70%?
   - ¿Si es préstamo hipotecario, cumple las reglas específicas?
   ↓
4. Si cumple → ✅ Activo registrado como COMPLIANT
   Si no cumple → ⚠️ Activo registrado como NON_COMPLIANT + Alerta generada
   ↓
5. fidufi genera Verifiable Credential (VC) y ancla hash en blockchain
   ↓
6. El fiduciario puede ver el resultado y las alertas
```

### Ejemplo Práctico

**Escenario**: Fiduciario quiere registrar un bono gubernamental de $25,000,000 MXN

1. **fidufi calcula**:
   - Patrimonio total: $68,500,000
   - Límite de bonos (30%): $20,550,000
   - Bonos actuales: $15,000,000
   - Nuevo total sería: $40,000,000

2. **fidufi valida**: ❌ Excede el límite del 30%

3. **fidufi registra**:
   - Activo marcado como NON_COMPLIANT
   - Alerta enviada al Fiduciario
   - VC generado y anclado en blockchain (evidencia inmutable)

4. **El Fiduciario ve**:
   - "Activo registrado con advertencias"
   - "Excede límite del 30% en bonos gubernamentales"
   - Puede decidir si proceder o no

## 🎭 Roles en el Sistema

### FIDUCIARIO
- Registra activos en el sistema
- Recibe alertas por incumplimientos
- Ve el estado de cumplimiento

### COMITE_TECNICO
- Puede registrar activos
- Puede modificar límites de inversión
- Aprueba excepciones

### AUDITOR
- Solo lectura
- Ve todos los activos y su cumplimiento
- Puede verificar evidencia en blockchain

### REGULADOR
- Solo lectura
- Verifica cumplimiento regulatorio

## 🔐 Seguridad y Transparencia

### Identidad
- Soporte para múltiples identidades (DID, Ethereum, Polkadot)
- Autenticación con JWT
- En el futuro: verificación criptográfica real

### Evidencia Inmutable
- Cada activo registrado genera un Verifiable Credential (VC)
- El hash del VC se ancla en blockchain (Polygon zkEVM o IPFS)
- Cualquiera puede verificar la evidencia

### Auditabilidad
- Historial completo de todos los activos registrados
- Estado de cumplimiento para cada uno
- Alertas generadas automáticamente

## 💡 Valor Agregado

### Para el Fiduciario
- Validación automática antes de ejecutar
- Alertas tempranas de incumplimientos
- Evidencia de cumplimiento para auditores

### Para Auditores
- Acceso completo al historial
- Verificación de evidencia en blockchain
- Reportes de cumplimiento automáticos

### Para Reguladores
- Transparencia total
- Evidencia inmutable de decisiones
- Cumplimiento verificable

## 🚫 Lo que fidufi NO hace

- ❌ **NO custodia activos** (solo valida reglas)
- ❌ **NO reemplaza al fiduciario** (él sigue ejecutando)
- ❌ **NO maneja dinero** (solo registra y valida)
- ❌ **NO toma decisiones** (solo valida reglas objetivas)

## 📊 Tecnología

- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **Frontend**: React + Vite + shadcn/ui (PWA)
- **Blockchain**: Polygon zkEVM (anclaje de hashes)
- **Estándares**: W3C Verifiable Credentials

## 🎯 En Resumen

**fidufi es como un "semáforo inteligente" para fideicomisos**:
- 🟢 Verde = Activo cumple todas las reglas
- 🟡 Amarillo = Activo registrado pero con advertencias
- 🔴 Rojo = Activo no cumple reglas (pero igual se registra como evidencia)

**El fiduciario siempre puede decidir**, pero fidufi le da la información necesaria para tomar decisiones informadas y genera evidencia auditable de todo.
