# Guía para Extraer Información del Contrato PDF

Esta guía te ayudará a extraer la información clave del PDF del contrato para completar el análisis y actualizar el código.

## Herramientas Recomendadas

### Opción 1: Usar Python (Recomendado)

```bash
# Instalar pdfplumber
pip install pdfplumber

# Extraer texto completo
python3 scripts/extract_pdf.py docs/Contrato_de_Fideicomiso_10045__1.pdf

# El texto se guardará en: docs/Contrato_de_Fideicomiso_10045__1_extracted.txt
```

### Opción 2: Usar herramientas del sistema

```bash
# Si tienes pdftotext instalado
pdftotext docs/Contrato_de_Fideicomiso_10045__1.pdf docs/contrato.txt

# Si tienes pdftk
pdftk docs/Contrato_de_Fideicomiso_10045__1.pdf dump_data output info.txt
```

### Opción 3: Usar herramientas online

- Sube el PDF a herramientas como Adobe Acrobat Online
- Usa conversores PDF a texto online
- Copia y pega el texto relevante

## Información Clave a Buscar

### 1. Buscar estas palabras clave en el PDF:

- "30%" o "treinta por ciento"
- "70%" o "setenta por ciento"
- "bonos" o "bonos federales"
- "préstamo hipotecario" o "préstamos hipotecarios"
- "salario mínimo"
- "10 veces" o "diez veces"
- "10 años" o "20 años" o "plazo"
- "seguro de vida"
- "seguro hipotecario"
- "honorarios"
- "Comité Técnico"
- "mayoría"
- "Cláusula Cuarta" o "Cláusula Cuarta-b"

### 2. Secciones importantes a revisar:

1. **Cláusulas de inversión** (buscar "Cláusula Cuarta" o similar)
2. **Definiciones** (al inicio del contrato)
3. **Gobernanza** (sección sobre Comité Técnico)
4. **Honorarios** (sección sobre pagos)
5. **Procedimientos** (cómo se registran activos)

### 3. Información específica a extraer:

#### Reglas de Inversión
- [ ] Porcentaje exacto para bonos (confirmar 30%)
- [ ] Porcentaje exacto para otros activos (confirmar 70%)
- [ ] Lista completa de tipos de activos incluidos en cada categoría
- [ ] Excepciones o casos especiales

#### Préstamos Hipotecarios
- [ ] Fórmula exacta del límite de precio
- [ ] Definición de "salario mínimo anual del área"
- [ ] Rango exacto de plazo (¿10-20 años inclusive?)
- [ ] Requisitos específicos de seguros
- [ ] Otros requisitos no mencionados

#### Honorarios
- [ ] Monto o porcentaje de honorarios
- [ ] Frecuencia de pago
- [ ] Cómo se verifica el pago
- [ ] Consecuencias de no pago

#### Comité Técnico
- [ ] Número exacto de miembros
- [ ] Quórum requerido
- [ ] Funciones específicas
- [ ] Procedimientos de votación

## Cómo Completar el Análisis

1. **Extrae el texto del PDF** usando una de las opciones arriba
2. **Busca las palabras clave** listadas arriba
3. **Completa** el archivo `docs/ANALISIS_CONTRATO.md` con la información encontrada
4. **Revisa** las reglas implementadas en `api/src/rules/` y actualiza si es necesario
5. **Actualiza** el código según las reglas exactas del contrato

## Ejemplo de Búsqueda

Si encuentras algo como:

> "El patrimonio se invertirá de la siguiente manera: hasta el treinta por ciento (30%) en bonos federales..."

Entonces confirma que el límite de 30% es correcto.

Si encuentras:

> "Los préstamos hipotecarios no excederán diez veces el salario mínimo mensual del área..."

Entonces necesitamos verificar si es "mensual" o "anual" y ajustar el código.

## Después de Extraer la Información

Una vez que tengas la información:

1. Completa `docs/ANALISIS_CONTRATO.md`
2. Comparte las secciones clave conmigo
3. Actualizaré el código según las reglas exactas del contrato

## Preguntas Frecuentes

**P: ¿Necesito leer todo el contrato?**
R: No necesariamente. Enfócate en las secciones sobre inversión, préstamos hipotecarios, honorarios y gobernanza.

**P: ¿Qué hago si encuentro discrepancias con el plan técnico?**
R: El contrato legal es la fuente de verdad. Actualizaremos el código para que coincida exactamente con el contrato.

**P: ¿Cómo sé si una regla es importante?**
R: Cualquier regla que afecte cómo se registran, validan o gestionan los activos es importante para fidufi.
