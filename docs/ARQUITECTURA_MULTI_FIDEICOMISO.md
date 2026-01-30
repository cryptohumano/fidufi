# Arquitectura Multi-Fideicomiso

## Problema Actual

Actualmente el sistema tiene estas limitaciones:

1. **No hay relación explícita entre Actores y Trusts**: Los usuarios pueden ver/registrar activos de cualquier fideicomiso si tienen el rol correcto, sin validar pertenencia.

2. **Alertas limitadas**: Solo se envían alertas al FIDUCIARIO cuando un activo no cumple, sin considerar:
   - Múltiples fideicomisos
   - Beneficiarios que deberían recibir notificaciones
   - Comité Técnico específico del fideicomiso

3. **Falta rol BENEFICIARIO**: Los beneficiarios del fideicomiso (fideicomisarios) no tienen forma de recibir alertas o consultar información.

## Solución Propuesta

### 1. Modelo ActorTrust (Tabla de Relación)

```prisma
model ActorTrust {
  id          String   @id @default(uuid())
  actorId    String
  actor      Actor     @relation(fields: [actorId], references: [id], onDelete: Cascade)
  trustId    String
  trust      Trust     @relation(fields: [trustId], references: [trustId], onDelete: Cascade)
  
  // Roles específicos dentro del fideicomiso
  // Un mismo actor puede tener diferentes roles en diferentes fideicomisos
  roleInTrust ActorRole // Puede ser diferente al role global del Actor
  
  // Fechas
  assignedAt DateTime @default(now())
  revokedAt  DateTime?
  
  // Estado
  active     Boolean  @default(true)
  
  @@unique([actorId, trustId])
  @@index([actorId])
  @@index([trustId])
  @@index([active])
}
```

**Ventajas:**
- Un usuario puede pertenecer a múltiples fideicomisos
- Puede tener diferentes roles en cada fideicomiso
- Permite revocar acceso sin eliminar el usuario
- Mantiene historial de asignaciones

### 2. Rol BENEFICIARIO

```prisma
enum ActorRole {
  SUPER_ADMIN
  FIDUCIARIO
  COMITE_TECNICO
  AUDITOR
  REGULADOR
  BENEFICIARIO  // Nuevo: Fideicomisarios que reciben alertas
}
```

**Características del rol BENEFICIARIO:**
- Solo lectura (no puede registrar activos)
- Recibe alertas sobre activos de sus fideicomisos
- Puede consultar información del fideicomiso
- Puede ver resumen de inversiones

### 3. Lógica de Alertas Mejorada

Cuando se registra un activo que no cumple:

1. **Alerta al FIDUCIARIO** del fideicomiso específico
2. **Alerta al COMITE_TECNICO** del fideicomiso específico
3. **Alerta a todos los BENEFICIARIOS** del fideicomiso

### 4. Validación de Pertenencia

Antes de registrar un activo o acceder a información:
- Verificar que el usuario pertenece al fideicomiso (`ActorTrust`)
- Validar que tiene el rol adecuado para la acción

## Migración

1. Agregar modelo `ActorTrust` al schema
2. Agregar `BENEFICIARIO` al enum `ActorRole`
3. Crear migración de datos para asignar usuarios existentes al fideicomiso 10045
4. Actualizar servicios para validar pertenencia
5. Actualizar lógica de alertas

## Ejemplo de Uso

```typescript
// Asignar usuario a fideicomiso
await prisma.actorTrust.create({
  data: {
    actorId: 'user-123',
    trustId: '10045',
    roleInTrust: 'BENEFICIARIO',
  },
});

// Verificar pertenencia antes de registrar activo
const membership = await prisma.actorTrust.findUnique({
  where: {
    actorId_trustId: {
      actorId: req.user.actorId,
      trustId: data.trustId,
    },
  },
});

if (!membership || !membership.active) {
  throw new Error('No perteneces a este fideicomiso');
}
```
