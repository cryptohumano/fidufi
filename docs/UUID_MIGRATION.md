# Migración a UUID

## Cambio Realizado

Se migró el schema de Prisma de `@default(cuid())` a `@default(uuid())` para todos los modelos.

### Razones para usar UUID

1. **Estándar universal**: RFC 4122, compatible con todos los sistemas
2. **Mejor integración**: Compatible con sistemas externos y blockchain
3. **Seguridad**: No revela información sobre el orden de creación
4. **Compatibilidad**: Funciona mejor con APIs REST y sistemas distribuidos

### Modelos Actualizados

- `Actor`
- `Asset`
- `Alert`
- `RuleModification`
- `Trust`
- `FiduciarioFee`
- `MonthlyFeePayment`

## Nota sobre Datos Existentes

Los datos existentes en la base de datos seguirán usando CUIDs hasta que se haga un reset completo:

```bash
# Reset completo (elimina todos los datos)
cd api
yarn prisma migrate reset

# Luego ejecutar seed nuevamente
yarn prisma:seed
```

Los nuevos registros creados después de la migración usarán UUIDs automáticamente.

## Verificación

Para verificar que los nuevos registros usan UUIDs:

```sql
-- Ver formato de IDs
SELECT id FROM "Actor" ORDER BY "createdAt" DESC LIMIT 5;

-- UUID tiene formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 caracteres)
-- CUID tiene formato: cxxxxxxxxxxxxxxxxxxxxx (25 caracteres)
```

## Próximos Pasos

1. ✅ Schema actualizado a UUID
2. ⏳ Reset de base de datos (opcional, solo si quieres datos limpios)
3. ✅ Nuevos registros usarán UUID automáticamente
