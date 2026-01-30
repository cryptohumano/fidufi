# Reglas de Negocio - Contrato 10045

Este documento detalla las reglas de negocio implementadas según el Contrato de Fideicomiso No. 10045, firmado el 9 de agosto de 2002.

## Contexto del Fideicomiso

- **Fideicomitente**: Banco del Ahorro Nacional y Servicios Financieros, S.N.C., Institución de Banca de Desarrollo
- **Fiduciario**: Banco del Ahorro Nacional y Servicios Financieros, S.N.C., Institución de Banca de Desarrollo, Coordinación Fiduciaria (misma entidad)
- **Patrimonio inicial**: $68,500,000.00 MXN
- **ID del Contrato**: 10045
- **Fecha del Contrato**: 9 de agosto de 2002

## Reglas de Inversión

### Límite de Bonos Gubernamentales (30%)

**Regla**: El total acumulado de inversión en bonos federales o instrumentos de renta fija no debe exceder el **30%** del patrimonio fideicomitido.

**Implementación**: `validateBondLimit()` en `api/src/rules/investmentRules.ts`

**Cálculo**:
```
Límite = Patrimonio Inicial × 30%
Inversión Actual = Suma de todos los activos tipo GovernmentBond
Nueva Inversión = Inversión Actual + Nuevo Activo (si es GovernmentBond)

Cumple si: Nueva Inversión ≤ Límite
```

**Ejemplo**:
- Patrimonio inicial: $68,500,000 MXN
- Límite: $20,550,000 MXN (30%)
- Inversión actual en bonos: $18,000,000 MXN
- Nuevo bono: $3,000,000 MXN
- Nueva inversión total: $21,000,000 MXN
- **Resultado**: ❌ NO CUMPLE (excede límite por $450,000)

### Límite de Otros Activos (70%)

**Regla**: El total acumulado de inversión en valores aprobados por CNBV, vivienda social o préstamos bajo condiciones específicas no debe exceder el **70%** del patrimonio fideicomitido.

**Tipos de activos incluidos**:
- `MortgageLoan` (Préstamos hipotecarios)
- `InsuranceReserve` (Reservas de seguros)
- `CNBVApproved` (Valores aprobados por CNBV)
- `SocialHousing` (Vivienda social)

**Implementación**: `validateOtherAssetsLimit()` en `api/src/rules/investmentRules.ts`

**Cálculo**:
```
Límite = Patrimonio Inicial × 70%
Inversión Actual = Suma de activos tipo MortgageLoan, InsuranceReserve, CNBVApproved, SocialHousing
Nueva Inversión = Inversión Actual + Nuevo Activo (si es de tipo "otro")

Cumple si: Nueva Inversión ≤ Límite
```

## Reglas para Préstamos Hipotecarios

Según la **Cláusula Cuarta-b** del contrato, los préstamos hipotecarios deben cumplir con los siguientes requisitos:

### 1. Límite de Precio

**Regla**: El precio del inmueble no debe exceder **10 veces el salario mínimo anual del área**.

**Implementación**: `validatePriceLimit()` en `api/src/rules/mortgageRules.ts`

**Cálculo**:
```
Precio Máximo = Salario Mínimo Anual del Área × 10

Cumple si: Precio del Inmueble ≤ Precio Máximo
```

**Ejemplo**:
- Salario mínimo anual del área: $150,000 MXN
- Precio máximo permitido: $1,500,000 MXN
- Precio del inmueble: $1,200,000 MXN
- **Resultado**: ✅ CUMPLE

### 2. Plazo del Préstamo

**Regla**: El plazo del préstamo debe estar entre **10 y 20 años** (inclusive).

**Implementación**: `validateTermRange()` en `api/src/rules/mortgageRules.ts`

**Validación**:
```
Cumple si: 10 ≤ Plazo (años) ≤ 20
```

**Ejemplos**:
- Plazo: 15 años → ✅ CUMPLE
- Plazo: 9 años → ❌ NO CUMPLE (menor a 10)
- Plazo: 21 años → ❌ NO CUMPLE (mayor a 20)

### 3. Seguros Requeridos

**Regla**: El préstamo debe contar con:
- ✅ Seguro de vida
- ✅ Seguro hipotecario

**Implementación**: `validateInsuranceRequirements()` en `api/src/rules/mortgageRules.ts`

**Validación**:
```
Cumple si: hasLifeInsurance === true AND hasMortgageInsurance === true
```

## Regla de Honorarios del Fiduciario (Cláusula Decima Segunda)

**Regla crítica**: "Para que el Fiduciario lleve a cabo cualquier acto derivado del presente contrato, deberán estar cubiertos sus honorarios por todos los conceptos antes citados."

### Montos de Honorarios

1. **Por estudio y aceptación**: $5,000.00 MXN (una sola vez, a la firma del contrato)
2. **Por manejo y administración anual**: $18,000.00 MXN (pagadera proporcionalmente por mensualidad vencida = $1,500/mes)
3. **Por modificación**: $5,000.00 MXN (a la firma del convenio respectivo)

### Validación Requerida

Antes de registrar cualquier activo, se debe validar:

- ✅ Honorario de estudio pagado (una vez)
- ✅ Honorarios mensuales al día (hasta el mes actual)

**Implementación**: `validateFiduciarioFeesPaid()` en `api/src/rules/fiduciarioFeeRules.ts`

## Estados de Cumplimiento

Un activo puede tener los siguientes estados:

- `COMPLIANT`: Cumple todas las reglas aplicables
- `NON_COMPLIANT`: No cumple alguna regla
- `PENDING_REVIEW`: Requiere revisión del Comité Técnico
- `EXCEPTION_APPROVED`: Excepción aprobada por el Comité Técnico

## Flujo de Validación

Cuando se registra un nuevo activo:

1. **Identificar tipo de activo**
   - Si es `GovernmentBond` → Validar límite 30%
   - Si es `MortgageLoan`, `InsuranceReserve`, `CNBVApproved`, `SocialHousing` → Validar límite 70%

2. **Validar reglas específicas**
   - Si es `MortgageLoan` → Validar precio, plazo y seguros

3. **Determinar estado de cumplimiento**
   - Si todas las reglas pasan → `COMPLIANT`
   - Si alguna falla → `NON_COMPLIANT`

4. **Generar alertas**
   - Si `NON_COMPLIANT` → Generar alerta para el Fiduciario

5. **Anclar evidencia**
   - Siempre se ancla evidencia en blockchain (hash + metadatos públicos)
   - Independientemente del estado de cumplimiento

## Notas Importantes

- Las reglas son **objetivas y deterministas**
- Cada validación queda **registrada de forma verificable**
- El sistema **no reemplaza al fiduciario**, solo valida cumplimiento técnico
- Las reglas pueden ser modificadas por el **Comité Técnico** (requiere mayoría)
- Todas las modificaciones quedan registradas en `RuleModification`
