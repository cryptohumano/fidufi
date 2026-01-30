# Asociación de Activos y Visibilidad por Rol

## Resumen

Este documento explica cómo se asocian los activos a beneficiarios y qué activos puede ver cada rol en el sistema.

## Modelo de Datos

### Campos del Modelo Asset

Cada activo (`Asset`) tiene los siguientes campos relevantes para la asociación:

```prisma
model Asset {
  id                String          @id @default(uuid())
  trustId           String          // ID del fideicomiso (ej. "10045")
  
  // Actor que registró el activo
  registeredBy      String          // Actor.id del Fiduciario o Comité Técnico
  actor             Actor            @relation(fields: [registeredBy], references: [id])
  
  // Beneficiario asociado (opcional)
  beneficiaryId     String?         // Actor.id del beneficiario (solo si aplica)
  beneficiary       Actor?          @relation("BeneficiaryAssets", fields: [beneficiaryId], references: [id])
  
  // ... otros campos
}
```

### Tipos de Asociación

1. **Activos Generales del Fideicomiso** (`beneficiaryId = null`):
   - Bonos gubernamentales
   - Reservas de seguros
   - Valores CNBV aprobados
   - Estos activos pertenecen al fideicomiso en general, no a un beneficiario específico

2. **Activos Asociados a Beneficiarios** (`beneficiaryId != null`):
   - Préstamos hipotecarios para trabajadores específicos
   - Vivienda social para trabajadores específicos
   - Estos activos están asociados a un beneficiario (trabajador) específico

## Visibilidad por Rol

### BENEFICIARIO (Fideicomisario)

**Qué puede ver:**
- ✅ Solo activos donde `beneficiaryId = su ID`
- ✅ Alertas relacionadas con sus activos
- ✅ Resumen del fideicomiso (solo lectura)

**Qué NO puede ver:**
- ❌ Activos generales del fideicomiso (`beneficiaryId = null`)
- ❌ Activos de otros beneficiarios
- ❌ No puede registrar activos

**Lógica de Filtrado:**
```typescript
// En getAssets()
if (actorRole === ActorRole.BENEFICIARIO && actorId) {
  where.beneficiaryId = actorId; // Solo sus activos
}
```

**Ejemplo:**
- Beneficiario con ID `beneficiario-123` solo ve:
  - Activos con `beneficiaryId = "beneficiario-123"`
  - No ve activos con `beneficiaryId = null` (generales)
  - No ve activos con `beneficiaryId = "beneficiario-456"` (de otros)

---

### FIDUCIARIO

**Qué puede ver:**
- ✅ Todos los activos del fideicomiso donde pertenece (`trustId`)
- ✅ Activos generales y activos de todos los beneficiarios
- ✅ Puede registrar nuevos activos
- ✅ Puede asociar activos a beneficiarios al registrarlos

**Lógica de Filtrado:**
```typescript
// En getAssets()
where.trustId = filters.trustId; // Todos los activos del fideicomiso
// No se filtra por beneficiaryId
```

**Ejemplo:**
- Fiduciario del fideicomiso `10045` ve:
  - Todos los activos con `trustId = "10045"`
  - Independientemente de si tienen `beneficiaryId` o no

---

### COMITE_TECNICO

**Qué puede ver:**
- ✅ Todos los activos del fideicomiso donde pertenece (`trustId`)
- ✅ Activos generales y activos de todos los beneficiarios
- ✅ Puede registrar nuevos activos
- ✅ Puede asociar activos a beneficiarios al registrarlos

**Lógica de Filtrado:**
```typescript
// En getAssets()
where.trustId = filters.trustId; // Todos los activos del fideicomiso
// No se filtra por beneficiaryId
```

---

### AUDITOR

**Qué puede ver:**
- ✅ Todos los activos del fideicomiso donde pertenece (`trustId`)
- ✅ Activos generales y activos de todos los beneficiarios
- ✅ Solo lectura (no puede registrar activos)

**Lógica de Filtrado:**
```typescript
// En getAssets()
where.trustId = filters.trustId; // Todos los activos del fideicomiso
// No se filtra por beneficiaryId
```

---

### REGULADOR

**Qué puede ver:**
- ✅ Todos los activos del fideicomiso donde pertenece (`trustId`)
- ✅ Activos generales y activos de todos los beneficiarios
- ✅ Solo lectura (no puede registrar activos)

**Lógica de Filtrado:**
```typescript
// En getAssets()
where.trustId = filters.trustId; // Todos los activos del fideicomiso
// No se filtra por beneficiaryId
```

---

### SUPER_ADMIN

**Qué puede ver:**
- ✅ Todos los activos de todos los fideicomisos
- ✅ Puede registrar activos en cualquier fideicomiso
- ✅ Acceso completo sin restricciones

**Lógica de Filtrado:**
```typescript
// En getAssets()
// Si no se especifica trustId, puede ver todos
// Si se especifica trustId, ve todos los activos de ese fideicomiso
where.trustId = filters.trustId || undefined; // Puede ser cualquier fideicomiso
```

---

## Flujo de Registro de Activos

### 1. Activos Generales (sin beneficiario)

Cuando un Fiduciario o Comité Técnico registra un activo general:

```typescript
{
  trustId: "10045",
  assetType: "GovernmentBond",
  valueMxn: 1000000,
  beneficiaryId: undefined, // null
  registeredBy: "fiduciario-123"
}
```

**Resultado:**
- `beneficiaryId = null`
- Visible para: FIDUCIARIO, COMITE_TECNICO, AUDITOR, REGULADOR, SUPER_ADMIN
- NO visible para: BENEFICIARIO

### 2. Activos Asociados a Beneficiario

Cuando un Fiduciario o Comité Técnico registra un préstamo hipotecario o vivienda social:

```typescript
{
  trustId: "10045",
  assetType: "MortgageLoan",
  valueMxn: 500000,
  beneficiaryId: "beneficiario-123", // Asociado a un beneficiario específico
  registeredBy: "fiduciario-123"
}
```

**Resultado:**
- `beneficiaryId = "beneficiario-123"`
- Visible para:
  - El beneficiario específico (`beneficiario-123`)
  - FIDUCIARIO, COMITE_TECNICO, AUDITOR, REGULADOR, SUPER_ADMIN (todos los del fideicomiso)
- NO visible para: Otros beneficiarios

---

## Validaciones de Acceso

### Al Consultar un Activo Específico (`GET /assets/:id`)

```typescript
// En getAssetById()
if (actorRole === ActorRole.BENEFICIARIO && actorId) {
  if (asset.beneficiaryId !== actorId) {
    throw new Error('No tienes acceso a este activo');
  }
}
```

**Comportamiento:**
- BENEFICIARIO: Solo puede ver activos donde `beneficiaryId = su ID`
- Otros roles: Pueden ver cualquier activo del fideicomiso donde pertenecen

---

## Consultas Útiles

### Obtener todos los activos de un beneficiario

```typescript
const assets = await prisma.asset.findMany({
  where: {
    beneficiaryId: "beneficiario-123",
    trustId: "10045"
  }
});
```

### Obtener todos los activos generales de un fideicomiso

```typescript
const assets = await prisma.asset.findMany({
  where: {
    trustId: "10045",
    beneficiaryId: null
  }
});
```

### Obtener todos los activos de un fideicomiso (sin filtrar por beneficiario)

```typescript
const assets = await prisma.asset.findMany({
  where: {
    trustId: "10045"
    // No se especifica beneficiaryId
  }
});
```

---

## Resumen Visual

```
┌─────────────────────────────────────────────────────────────┐
│                    FIDEICOMISO 10045                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Activos Generales (beneficiaryId = null)                    │
│  ├─ Bono Gubernamental $1M                                   │
│  ├─ Reserva Seguros $500K                                    │
│  └─ Valor CNBV $2M                                           │
│                                                               │
│  Activos de Beneficiario 1 (beneficiaryId = "ben-1")        │
│  ├─ Préstamo Hipotecario $500K                               │
│  └─ Vivienda Social $300K                                     │
│                                                               │
│  Activos de Beneficiario 2 (beneficiaryId = "ben-2")        │
│  └─ Préstamo Hipotecario $600K                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘

VISIBILIDAD:
- BENEFICIARIO 1: Solo ve sus 2 activos (Préstamo + Vivienda)
- BENEFICIARIO 2: Solo ve su 1 activo (Préstamo)
- FIDUCIARIO: Ve todos los 6 activos
- COMITE_TECNICO: Ve todos los 6 activos
- AUDITOR: Ve todos los 6 activos
- REGULADOR: Ve todos los 6 activos
- SUPER_ADMIN: Ve todos los activos de todos los fideicomisos
```

---

## Notas Importantes

1. **Pertenencia al Fideicomiso**: Todos los roles (excepto SUPER_ADMIN) solo pueden ver activos de fideicomisos donde están asignados (tabla `ActorTrust`).

2. **Beneficiarios**: Los beneficiarios solo ven activos explícitamente asociados a ellos mediante `beneficiaryId`. No ven activos generales del fideicomiso.

3. **Registro de Activos**: Solo FIDUCIARIO y COMITE_TECNICO pueden registrar activos. Al registrar, pueden opcionalmente asociar el activo a un beneficiario.

4. **Validación**: Cuando se registra un activo con `beneficiaryId`, el sistema valida que:
   - El beneficiario existe
   - El beneficiario tiene rol `BENEFICIARIO`
   - El beneficiario pertenece al fideicomiso especificado
