# Activos de Prueba - fidufi

## 📊 Resumen de Activos Creados en el Seed

El seed crea **8 activos de prueba** con diferentes características para probar el sistema de validación:

### ✅ Activos que Cumplen las Reglas

#### 1. Bono Gubernamental
- **Tipo:** `GovernmentBond`
- **Valor:** $15,000,000 MXN
- **Descripción:** Bonos del Gobierno Federal a 10 años
- **Estado:** ✅ Cumple
- **Registrado por:** Fiduciario
- **Nota:** Representa ~21.9% del patrimonio (dentro del límite del 30%)

#### 2. CETES
- **Tipo:** `GovernmentBond`
- **Valor:** $5,500,000 MXN
- **Descripción:** CETES a 28 días
- **Estado:** ✅ Cumple
- **Registrado por:** Fiduciario
- **Nota:** Acumula ~30% del patrimonio en bonos (límite máximo)

#### 4. Valores CNBV
- **Tipo:** `CNBVApproved`
- **Valor:** $25,000,000 MXN
- **Descripción:** Fondos de inversión aprobados por CNBV
- **Estado:** ✅ Cumple
- **Registrado por:** Comité Técnico (Guillermo Téllez)

#### 5. Reserva de Seguros
- **Tipo:** `InsuranceReserve`
- **Valor:** $10,000,000 MXN
- **Descripción:** Reserva técnica de seguros de vida
- **Estado:** ✅ Cumple
- **Registrado por:** Fiduciario

#### 8. Vivienda Social
- **Tipo:** `SocialHousing`
- **Valor:** $5,000,000 MXN
- **Descripción:** Adquisición de vivienda social para trabajadores
- **Estado:** ✅ Cumple
- **Registrado por:** Comité Técnico (Alejandro Frigolet)

---

### ❌ Activos que NO Cumplen las Reglas

#### 3. Préstamo Hipotecario (No Cumple)
- **Tipo:** `MortgageLoan`
- **Valor:** $2,000,000 MXN
- **Descripción:** Préstamo hipotecario vivienda social - Trabajador #001
- **Estado:** ❌ No cumple
- **Registrado por:** Fiduciario
- **Razón:** Probablemente alguna regla de préstamo hipotecario no se cumple

#### 6. Bono Excedente
- **Tipo:** `GovernmentBond`
- **Valor:** $10,000,000 MXN
- **Descripción:** Bono adicional que excede límite del 30%
- **Estado:** ❌ No cumple
- **Registrado por:** Comité Técnico (Octavio Ferrer)
- **Razón:** Excede el límite del 30% de inversión en bonos

#### 7. Préstamo Hipotecario Excedente
- **Tipo:** `MortgageLoan`
- **Valor:** $3,000,000 MXN
- **Descripción:** Préstamo hipotecario - Precio excede límite
- **Estado:** ❌ No cumple
- **Registrado por:** Fiduciario
- **Razón:** Precio de $1.2M excede 10x el salario mínimo anual ($800k máximo permitido)

---

## 🔍 Validaciones Aplicadas

Cada activo pasa por las siguientes validaciones:

1. **Honorarios del Fiduciario:** Verifica que todos los honorarios estén pagados
2. **Reglas de Inversión:**
   - Límite del 30% en bonos gubernamentales
   - Límite del 70% en otras inversiones
3. **Reglas de Préstamos Hipotecarios:**
   - Precio ≤ 10x salario mínimo anual
   - Plazo: 10-20 años
   - Requiere seguro de vida e hipoteca
   - Tasa de interés ≤ rendimiento máximo de bonos

## 📈 Estadísticas Totales

- **Total de Activos:** 8
- **Activos que Cumplen:** 5 (62.5%)
- **Activos que No Cumplen:** 3 (37.5%)
- **Total Invertido:** ~$65,500,000 MXN
- **Bonos Gubernamentales:** ~$30,500,000 MXN (~44.5%)
- **Otras Inversiones:** ~$35,000,000 MXN (~51.1%)

## 🚨 Alertas Generadas

Los activos que no cumplen generan alertas automáticas para:
- El Fiduciario
- El Comité Técnico (si aplica)

## 🔗 Blockchain

Todos los activos tienen:
- ✅ Verifiable Credential (VC) generado
- ✅ Hash anclado en IPFS (fallback, ya que Polygon zkEVM no está configurado)
- ✅ Metadatos de blockchain guardados

## 📝 Notas

- Los activos se crean usando el servicio `registerAsset` que aplica todas las validaciones
- Los activos que no cumplen se registran igual pero con `compliant: false`
- Las alertas se generan automáticamente para activos no cumplientes
- Todos los activos tienen VCs anclados para trazabilidad inmutable
