# Campos en base de datos por tipo de fideicomiso

La tabla **Trust** es única: tiene columnas para todos los tipos. Según el tipo, **solo parte de esas columnas son relevantes**; el resto se rellenan por defecto o se ignoran en la lógica de negocio.

---

## Por qué un fideicomiso de construcción tiene columnas de inversión

- El **schema** tiene una sola tabla Trust con columnas para todos los tipos. `initialCapital` es obligatorio; `bondLimitPercent` y `otherLimitPercent` son **opcionales** (desde la migración 20260221230000).
- Para **Construcción** el servicio ya **no escribe** límites: se guardan `bondLimitPercent: null` y `otherLimitPercent: null`. Solo se usan `trustTypeConfig.presupuestoTotal`, `baseCurrency` y comunes.
- Para **Financiero** sí se guardan y usan initialCapital, bondLimitPercent, otherLimitPercent.

---

## Tabla Trust: qué usa cada tipo

### Comunes a todos los tipos

| Campo (Trust)        | Uso por tipo |
|----------------------|--------------|
| `trustId`            | ID del contrato (todos). |
| `name`               | Denominación (todos). |
| `trustTypeId`        | FK a TrustType: define Construcción / Financiero / Administrativo (todos). |
| `trustType`          | Legacy INVESTMENT/CONDOMINIUM; se deriva del tipo (todos). |
| `status`             | DRAFT / ACTIVO / CERRADO (todos). |
| `baseCurrency`       | Moneda para reportes (todos). |
| `constitutionDate`   | Fecha constitución (todos). |
| `maxTermYears`       | Plazo máximo años (todos). |
| `termType`           | STANDARD / FOREIGN / DISABILITY (todos). |
| `requiresConsensus`  | Consenso Comité (todos). |
| `fideicomitenteName`, `fiduciarioName`, etc. | Partes (todos, opcionales). |
| `fechaFirma`, `domicilioLegal`, `objetoTexto`, `finalidadCategoria`, etc. | ONBOARDING (todos, opcionales). |

### Construcción (CONSTRUCCION)

| Campo (Trust)        | ¿Se usa? | Notas |
|----------------------|----------|--------|
| **trustTypeConfig**  | **Sí**   | JSON con `presupuestoTotal` (monto obra). Es el dato principal de monto. |
| **baseCurrency**     | **Sí**   | Moneda de reportes y del presupuesto. |
| initialCapital       | Sí*      | *Se persiste el mismo valor que `presupuestoTotal` por restricción de schema (no nullable). No se usa como “patrimonio inversión”. |
| bondLimitPercent      | No       | Se guarda **null** para Construcción; no se usa en reglas ni UI. |
| otherLimitPercent     | No       | Se guarda **null** para Construcción; no se usa en reglas ni UI. |
| fechaObjetivoEntrega | Opcional | Fecha objetivo entrega de obra. |
| objetoTexto, finalidadCategoria | Opcional | Objeto y categoría del contrato. |

En la **UI de creación** para Construcción solo deberían mostrarse (y enviarse): tipo, presupuesto total, nombre, moneda, plazos, consenso. No patrimonio inicial ni límites bonos/otros.

### Financiero / Inversión (FINANCIERO)

| Campo (Trust)        | ¿Se usa? | Notas |
|----------------------|----------|--------|
| **initialCapital**   | **Sí**   | Patrimonio inicial / patrimonio fiduciario. |
| **bondLimitPercent** | **Sí**   | Límite % bonos (ej. 30). |
| **otherLimitPercent**| **Sí**   | Límite % otros activos (ej. 70). |
| **baseCurrency**     | **Sí**   | Moneda de reportes y montos. |
| trustTypeConfig      | No       | Típicamente `{}` o no usado. |

En la **UI de creación** para Financiero: tipo, patrimonio inicial, límites bonos/otros, moneda, plazos, consenso.

### Administrativo (ADMINISTRATIVO)

| Campo (Trust)        | ¿Se usa? | Notas |
|----------------------|----------|--------|
| **baseCurrency**     | **Sí**   | Moneda de reportes. |
| initialCapital       | Opcional | Puede haber patrimonio. |
| bondLimitPercent, otherLimitPercent | No | No aplican; se rellenan por defecto si el schema lo exige. |
| objetoTexto, finalidadCategoria | Opcional | Objeto y categoría. |

---

## Resumen por tipo (qué se persiste y qué se muestra)

| Tipo            | Campos que definen el tipo en BD | Campos que no aplican (se ignoran o son default) |
|-----------------|-----------------------------------|---------------------------------------------------|
| **CONSTRUCCION**| trustTypeId, trustTypeConfig.presupuestoTotal, baseCurrency | bondLimitPercent, otherLimitPercent en **null** (no aplican). |
| **FINANCIERO**  | trustTypeId, initialCapital, bondLimitPercent, otherLimitPercent, baseCurrency | trustTypeConfig (vacío o no usado). |
| **ADMINISTRATIVO** | trustTypeId, baseCurrency, opcional initialCapital | bondLimitPercent, otherLimitPercent (no aplican). |

---

## Cambio aplicado en BD para Construcción

Para que un fideicomiso de **construcción no tenga** “parámetros de inversión” en BD:

1. Hacer **nullable** en el schema: `bondLimitPercent` y `otherLimitPercent` (ej. `Decimal?`).
2. En el servicio de creación, cuando el tipo sea **CONSTRUCCION**, no enviar `bondLimitPercent` ni `otherLimitPercent` (o enviar `null`), para que en BD queden `null` para ese tipo.
3. En la UI y en la API, para Construcción no mostrar ni devolver esos campos como relevantes.

Así en la base de datos un trust de construcción tendría `bondLimitPercent` y `otherLimitPercent` en `null`, y solo los campos listados arriba como “usados” para Construcción tendrían valor significativo.
