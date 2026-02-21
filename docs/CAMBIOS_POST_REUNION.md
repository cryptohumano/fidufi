# Cambios Post-Reunión - Análisis y Prioridades

**Fecha:** 31 de Enero 2026  
**Reunión:** Walkthrough del POC de fidufi

## Resumen Ejecutivo

Durante la reunión se identificaron varios puntos de mejora y funcionalidades críticas que deben implementarse para fortalecer la propuesta de valor de la plataforma. El enfoque principal está en:

1. **Alertas como diferenciador principal** - El "sweet spot" de la plataforma
2. **Tokenización sin emisión** - Preparación para el futuro de activos tokenizados
3. **Indexación de oráculos y blockchains** - Diferenciador competitivo
4. **Mejoras en UX y completitud de datos**

---

## Cambios Prioritarios (Corto Plazo)

### 1. ✅ Formulario de Creación de Fideicomisos - Agregar Duración

**Prioridad:** ALTA  
**Estado:** Modelo ya tiene campos, falta en formulario

**Cambios requeridos:**
- Agregar campo `maxTermYears` (25-30 años por defecto, máximo 99 años)
- Agregar campo `termType` (STANDARD, FOREIGN, DISABILITY)
- Agregar campo `constitutionDate` (fecha de constitución)
- Calcular automáticamente `expirationDate` basado en `constitutionDate` + `maxTermYears`

**Archivos a modificar:**
- `app/src/pages/TrustsManagementPage.tsx` - Agregar campos al formulario
- `api/src/routes/trusts.ts` - Validar y procesar nuevos campos
- `api/src/services/trustService.ts` - Calcular fecha de expiración

---

### 2. ✅ Mejorar Dropdown de Fideicomiso en Registro de Activos

**Prioridad:** ALTA  
**Estado:** Actualmente requiere selección manual

**Cambios requeridos:**
- Si el usuario solo tiene acceso a un fideicomiso, seleccionarlo por defecto
- Si tiene múltiples fideicomisos, mostrar dropdown con opciones
- Mejorar UX del selector

**Archivos a modificar:**
- `app/src/pages/AssetsPage.tsx` - Lógica de selección automática
- `app/src/components/assets/AssetRegistrationForm.tsx` (si existe)

---

### 3. ✅ Clarificar Lógica de Estados: NON_COMPLIANT vs PENDING_REVIEW

**Prioridad:** ALTA  
**Estado:** Confusión actual en la lógica

**Problema identificado:**
- Un préstamo hipotecario apareció como NON_COMPLIANT en lugar de PENDING_REVIEW
- La razón: el activo excedía el límite del 70% pero la regla de validación lo marcó directamente como non-compliant

**Cambios requeridos:**
- Revisar lógica en `api/src/services/assetService.ts`
- PENDING_REVIEW debe aplicarse cuando:
  - El activo excede límites PERO puede ser aprobado como excepción
  - El tipo de activo permite excepciones
- NON_COMPLIANT debe aplicarse cuando:
  - El activo viola reglas que NO pueden tener excepción
  - Ya fue rechazado por el Comité Técnico

**Archivos a modificar:**
- `api/src/services/assetService.ts` - Función `registerAsset`
- `api/src/services/complianceAnalyticsService.ts` - Lógica de validación

---

### 4. ✅ Mejorar Diálogo de Aprobación de Excepciones

**Prioridad:** ALTA  
**Estado:** Falta información contextual

**Cambios requeridos:**
- Mostrar estado actual del fideicomiso antes de aprobar/rechazar
- Incluir métricas clave:
  - Patrimonio actual
  - Porcentaje utilizado en cada categoría
  - Espacio disponible
  - Impacto de aprobar este activo
- Mostrar historial de excepciones similares

**Archivos a modificar:**
- `app/src/components/assets/ExceptionApprovalDialog.tsx`
- Agregar llamada a `trustsApi.getSummary(trustId)` para obtener métricas
- Mostrar información contextual en el diálogo

---

### 5. ✅ Sistema de Consenso para Comité Técnico

**Prioridad:** MEDIA  
**Estado:** ✅ Implementado (feb 2026)

**Cambios requeridos:**
- Agregar campo `requiresConsensus` al modelo Trust
- Si `requiresConsensus = true`:
  - Enviar notificación por email/WhatsApp a todos los miembros
  - Requerir aprobación de mayoría (2 de 3 miembros)
  - Mostrar estado de votaciones en tiempo real
- Si `requiresConsensus = false`:
  - Mantener comportamiento actual (un solo miembro aprueba)

**Archivos a crear/modificar:**
- `api/prisma/schema.prisma` - Agregar campo `requiresConsensus` a Trust
- `api/src/services/notificationService.ts` - Nuevo servicio para emails/WhatsApp
- `app/src/components/assets/ExceptionApprovalDialog.tsx` - UI de consenso
- Migración de base de datos

---

## Cambios de Mediano Plazo

### 6. ✅ Sistema de Plantillas por Tipo de Activo

**Prioridad:** MEDIA  
**Estado:** ✅ Implementado (modelo, servicio y rutas; UI pendiente de integración en formularios)

**Cambios requeridos:**
- Crear modelo `AssetTemplate` con campos predefinidos por tipo
- Al seleccionar tipo de activo, pre-llenar formulario con plantilla
- Permitir personalización de plantillas por fideicomiso

**Archivos a crear:**
- `api/prisma/schema.prisma` - Modelo AssetTemplate
- `api/src/services/assetTemplateService.ts`
- `app/src/components/assets/AssetTemplateSelector.tsx`

---

### 7. ⏳ Anclaje Blockchain de Documentos y Acciones Críticas

**Prioridad:** MEDIA  
**Estado:** Parcialmente implementado (hash en metadata)

**Cambios requeridos:**
- Implementar servicio de anclaje a blockchain (Polygon zkEVM o similar)
- Anclar documentos PDF/CSV/JSON a IPFS y guardar hash
- Anclar acciones críticas (aprobaciones, rechazos) con timestamp blockchain
- Mostrar hash y link de verificación en UI

**Archivos a crear/modificar:**
- `api/src/services/blockchainService.ts` - Nuevo servicio
- `api/src/services/ipfsService.ts` - Servicio IPFS
- Actualizar modelos para incluir `blockchainHash` y `ipfsHash`

---

### 8. ⏳ OCR para Digitalización de Documentos Físicos

**Prioridad:** BAJA  
**Estado:** No implementado

**Cambios requeridos:**
- Integrar servicio OCR (Tesseract.js o API externa)
- Procesar documentos físicos y extraer datos estructurados
- Mapear datos extraídos a campos del formulario de activos

**Archivos a crear:**
- `api/src/services/ocrService.ts`
- Endpoint para upload y procesamiento de documentos

---

### 9. ⏳ Reportes Mensuales/Trimestrales/Anuales con PDF

**Prioridad:** MEDIA  
**Estado:** En desarrollo (MonthlyStatements ya existe)

**Cambios requeridos:**
- Generar PDFs de estados de cuenta mensuales
- Generar reportes trimestrales consolidados
- Generar reportes anuales con análisis completo
- Integrar librería de generación de PDFs (PDFKit, jsPDF, o similar)

**Archivos a crear/modificar:**
- `api/src/services/reportService.ts`
- `api/src/services/pdfGenerationService.ts`
- Endpoints para descarga de reportes

---

## Cambios de Largo Plazo (Diferenciadores Estratégicos)

### 10. 🚀 Sistema de Indexación de Oráculos y Blockchains Públicas

**Prioridad:** ALTA (Diferenciador competitivo)  
**Estado:** No implementado

**Concepto:**
- Indexar datos de múltiples fuentes:
  - Bases de datos públicas (CNBV, SAT, etc.)
  - Blockchains públicas (Ethereum, Polygon, etc.)
  - APIs de terceros (precios de activos, tasas de interés)
- Proporcionar datos enriquecidos para validación y análisis
- Diferencia clave: "Hacemos lo mismo que otros, más algo nuevo"

**Archivos a crear:**
- `api/src/services/oracleService.ts`
- `api/src/services/blockchainIndexer.ts`
- Modelos para almacenar datos indexados
- Sistema de sincronización periódica

---

### 11. 🚀 Preparación para Tokenización Sin Emisión

**Prioridad:** ESTRATÉGICA  
**Estado:** Conceptual

**Concepto clave mencionado:**
- Tokenizar sobre activos existentes sin crear dinero nuevo
- Mint/Burn tokens basados en movimientos reales
- Gestor de reglas económicas para tokenización transparente
- Preparación para el futuro de activos digitales

**Consideraciones:**
- Este es un diferenciador futuro importante
- Requiere arquitectura preparada pero no implementación inmediata
- Documentar arquitectura y diseño para futura implementación

---

## Mejoras de Documentación y Presentación

### 12. 📄 Documentación de Seguridad y Blockchain de Peranto

**Prioridad:** MEDIA  
**Estado:** Falta documentación

**Cambios requeridos:**
- Crear documento explicando tecnología de seguridad de Peranto
- Documentar blockchain propio y ecosistema
- Preparar presentación para abogado (viernes siguiente)
- Crear wireframe general y documentación de diseño

**Archivos a crear:**
- `docs/SEGURIDAD_Y_BLOCKCHAIN.md`
- `docs/WIREFRAME_GENERAL.md`
- `docs/DESIGN_SPECIFICATION.md`

---

## Notas de la Reunión

### Puntos Clave Mencionados:

1. **Alertas son el "sweet spot"** - Debe ser excelente, es lo último que se pulirá
2. **Tokenización sin emisión** - Modelo disruptivo para el futuro
3. **No somos intermediarios** - No manejamos dinero, solo reglas económicas
4. **Modelo de negocio:** SaaS vs Licenciado (discutir con abogado)
5. **Mercados objetivo:**
   - México: Círculo de Crédito (potencial comprador/exclusividad)
   - Argentina: Fintechs que dan stablecoin y tokenización
   - Gobierno: Democracia abierta y partidas presupuestales

### Próximos Pasos:

1. ✅ Implementar cambios prioritarios (1-5)
2. ⏳ Preparar wireframe y documentación para abogado
3. ⏳ Reunión con abogado (viernes siguiente)
4. ⏳ MVP para comercialización
5. 🚀 Buscar fronting para Banco Santander (requiere facturación de $1M+)

---

## Priorización de Implementación

### Sprint 1 (Esta Semana):
1. ✅ Cambio #1: Duración en creación de fideicomisos
2. ✅ Cambio #2: Dropdown mejorado en registro de activos
3. ✅ Cambio #3: Clarificar lógica de estados
4. ✅ Cambio #4: Mejorar diálogo de aprobación

### Sprint 2 (Próxima Semana):
5. ✅ Cambio #5: Sistema de consenso (completado)
6. ✅ Cambio #6: Plantillas de activos (backend completado)
7. ⏳ Cambio #9: Reportes PDF
8. ⏳ Cambio #12: Documentación

### Sprint 3 (Mediano Plazo):
8. ⏳ Cambio #6: Plantillas de activos
9. ⏳ Cambio #7: Anclaje blockchain
10. ⏳ Cambio #10: Indexación de oráculos

### Futuro:
11. 🚀 Cambio #8: OCR
12. 🚀 Cambio #11: Tokenización sin emisión

---

**Última actualización:** 21 de Febrero 2026
