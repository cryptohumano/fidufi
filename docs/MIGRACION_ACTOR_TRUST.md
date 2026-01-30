# Guía de Migración: ActorTrust y Multi-Fideicomiso

## Cambios Implementados

### 1. Schema de Prisma

- ✅ Agregado rol `BENEFICIARIO` al enum `ActorRole`
- ✅ Creado modelo `ActorTrust` para relación muchos-a-muchos entre Actores y Trusts
- ✅ Agregadas relaciones en modelos `Actor` y `Trust`

### 2. Servicios

- ✅ Creado `actorTrustService.ts` con funciones para:
  - Asignar actores a fideicomisos
  - Revocar acceso
  - Verificar pertenencia
  - Obtener fideicomisos de un actor
  - Obtener actores de un fideicomiso

### 3. Rutas API

- ✅ Creado `routes/actorTrust.ts` con endpoints:
  - `POST /api/actor-trust` - Asignar actor a fideicomiso (Super Admin)
  - `DELETE /api/actor-trust/:actorId/:trustId` - Revocar acceso (Super Admin)
  - `GET /api/actor-trust/actor/:actorId` - Obtener fideicomisos de un actor
  - `GET /api/actor-trust/trust/:trustId` - Obtener actores de un fideicomiso

### 4. Lógica de Negocio

- ✅ Actualizado `assetService.ts` para validar pertenencia antes de registrar activos
- ✅ Actualizado lógica de alertas para enviar a:
  - FIDUCIARIO del fideicomiso
  - COMITE_TECNICO del fideicomiso
  - BENEFICIARIOS del fideicomiso

### 5. Seed

- ✅ Actualizado seed para:
  - Crear beneficiarios de ejemplo
  - Asignar todos los usuarios al fideicomiso 10045

## Pasos para Aplicar los Cambios

### 1. Generar Migración

```bash
cd api
yarn prisma migrate dev --name add_actor_trust_and_beneficiario
```

### 2. Ejecutar Seed (asignará usuarios existentes al fideicomiso)

```bash
yarn prisma db seed
```

### 3. Verificar

- Los usuarios existentes deberían estar asignados al fideicomiso 10045
- Los beneficiarios deberían poder recibir alertas
- La validación de pertenencia debería funcionar al registrar activos

## Notas Importantes

1. **SUPER_ADMIN**: Los super admins pueden acceder a todos los fideicomisos sin necesidad de estar asignados explícitamente.

2. **Compatibilidad hacia atrás**: Los usuarios existentes se asignan automáticamente al fideicomiso 10045 en el seed, pero si tienes datos en producción, necesitarás crear un script de migración de datos.

3. **Validación**: La validación de pertenencia solo se aplica para roles que no son SUPER_ADMIN. Los super admins pueden registrar activos en cualquier fideicomiso.

4. **Alertas**: Las alertas ahora se envían a todos los actores relevantes del fideicomiso específico, no solo al primer FIDUCIARIO encontrado.
