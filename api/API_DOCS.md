# API Documentation - fidufi

Documentación de los endpoints REST de la API de fidufi.

## Base URL

```
http://localhost:3001/api
```

## Endpoints

### Health Check

#### `GET /health`
Verifica que el servidor esté funcionando.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-30T...",
  "version": "1.0.0"
}
```

---

### Fideicomisos (Trusts)

#### `GET /api/trusts/:trustId`
Obtiene información de un fideicomiso.

**Ejemplo:**
```bash
GET /api/trusts/10045
```

**Response:**
```json
{
  "id": "...",
  "trustId": "10045",
  "name": "Fideicomiso para el Pago de Pensiones...",
  "initialCapital": "68500000",
  "bondLimitPercent": "30",
  "otherLimitPercent": "70",
  "active": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### `GET /api/trusts/:trustId/summary`
Obtiene resumen del fideicomiso con estadísticas de inversión.

**Response:**
```json
{
  "trustId": "10045",
  "name": "...",
  "initialCapital": "68500000",
  "bondLimitPercent": "30",
  "otherLimitPercent": "70",
  "active": true,
  "totalAssets": 5,
  "totalInvested": "20500000",
  "bondInvestment": "15000000",
  "otherInvestment": "5500000",
  "bondPercent": 21.9,
  "otherPercent": 8.0
}
```

#### `PUT /api/trusts/:trustId/limits`
Actualiza límites de inversión (solo Comité Técnico).

**Body:**
```json
{
  "bondLimitPercent": 35,
  "otherLimitPercent": 65
}
```

---

### Actores (Actors)

#### `POST /api/actors/onboard`
Registra un nuevo actor con multi-identidad.

**Body:**
```json
{
  "name": "Banco del Ahorro Nacional",
  "role": "FIDUCIARIO",
  "primaryDid": "did:kilt:...",
  "ethereumAddress": "0x...",
  "polkadotAccountId": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "ensName": "banco.eth"
}
```

**Roles disponibles:**
- `FIDUCIARIO`
- `COMITE_TECNICO`
- `AUDITOR`
- `REGULADOR`

**Response:**
```json
{
  "id": "...",
  "name": "...",
  "role": "FIDUCIARIO",
  "primaryDid": "did:kilt:...",
  "createdAt": "..."
}
```

#### `GET /api/actors/:id`
Obtiene un actor por ID.

#### `GET /api/actors`
Lista todos los actores (con filtros opcionales).

**Query params:**
- `role`: Filtrar por rol

**Ejemplo:**
```bash
GET /api/actors?role=FIDUCIARIO
```

#### `POST /api/actors/find`
Busca un actor por identidad.

**Body:**
```json
{
  "type": "did",
  "value": "did:kilt:..."
}
```

**Tipos:** `did`, `ethereum`, `polkadot`

---

### Activos (Assets)

#### `POST /api/assets/register`
Registra un nuevo activo con validación completa de reglas.

**Body (Bono Gubernamental):**
```json
{
  "trustId": "10045",
  "assetType": "GovernmentBond",
  "valueMxn": 15000000,
  "description": "Bonos del Gobierno Federal",
  "documentHash": "0x...",
  "registeredBy": "actor-id-del-fiduciario"
}
```

**Body (Préstamo Hipotecario):**
```json
{
  "trustId": "10045",
  "assetType": "MortgageLoan",
  "valueMxn": 1200000,
  "description": "Préstamo para vivienda social",
  "documentHash": "0x...",
  "registeredBy": "actor-id-del-fiduciario",
  "mortgageData": {
    "price": 1200000,
    "loanAmount": 1200000,
    "termYears": 15,
    "monthlyPayment": 8000,
    "hasMortgageGuarantee": true,
    "hasLifeInsurance": true,
    "hasFireInsurance": true,
    "interestRate": 8.5,
    "areaMinimumWage": 120000,
    "maxBondYieldRate": 9.0
  }
}
```

**Tipos de activos:**
- `GovernmentBond` - Bonos gubernamentales
- `MortgageLoan` - Préstamos hipotecarios
- `InsuranceReserve` - Reservas de seguros
- `CNBVApproved` - Valores aprobados por CNBV
- `SocialHousing` - Vivienda social

**Response:**
```json
{
  "asset": {
    "id": "...",
    "trustId": "10045",
    "assetType": "GovernmentBond",
    "valueMxn": "15000000",
    "complianceStatus": "COMPLIANT",
    "compliant": true,
    "validationResults": {...},
    "registeredAt": "..."
  },
  "compliant": true,
  "complianceStatus": "COMPLIANT",
  "validationResults": [
    {
      "compliant": true,
      "status": "COMPLIANT",
      "message": "Inversión en bonos dentro del límite: 21.9% (límite: 30%)"
    }
  ],
  "alerts": []
}
```

#### `GET /api/assets`
Lista activos con filtros opcionales.

**Query params:**
- `trustId` (requerido)
- `assetType`: Filtrar por tipo
- `complianceStatus`: Filtrar por estado de cumplimiento
- `limit`: Límite de resultados (default: 100)
- `offset`: Offset para paginación

**Ejemplo:**
```bash
GET /api/assets?trustId=10045&assetType=GovernmentBond&limit=10
```

**Response:**
```json
{
  "assets": [
    {
      "id": "...",
      "trustId": "10045",
      "assetType": "GovernmentBond",
      "valueMxn": "15000000",
      "complianceStatus": "COMPLIANT",
      "actor": {
        "id": "...",
        "name": "...",
        "role": "FIDUCIARIO"
      }
    }
  ],
  "total": 5,
  "limit": 10,
  "offset": 0
}
```

#### `GET /api/assets/:id`
Obtiene un activo específico por ID.

#### `GET /api/assets/:id/compliance`
Obtiene detalles de cumplimiento de un activo.

---

### Alertas (Alerts)

#### `GET /api/alerts`
Lista alertas del actor actual.

**Query params:**
- `actorId` (requerido hasta implementar autenticación)
- `acknowledged`: Filtrar por estado (true/false)
- `limit`: Límite de resultados
- `offset`: Offset para paginación

**Ejemplo:**
```bash
GET /api/alerts?actorId=...&acknowledged=false
```

#### `PUT /api/alerts/:id/acknowledge`
Marca una alerta como leída.

---

## Códigos de Estado HTTP

- `200` - OK
- `201` - Created
- `400` - Bad Request (validación fallida)
- `403` - Forbidden (sin permisos)
- `404` - Not Found
- `500` - Internal Server Error

## Ejemplos de Uso

### Flujo Completo de Registro de Activo

```bash
# 1. Obtener información del fideicomiso
curl http://localhost:3001/api/trusts/10045

# 2. Registrar un bono gubernamental
curl -X POST http://localhost:3001/api/assets/register \
  -H "Content-Type: application/json" \
  -d '{
    "trustId": "10045",
    "assetType": "GovernmentBond",
    "valueMxn": 15000000,
    "description": "Bonos del Gobierno Federal",
    "registeredBy": "actor-id-del-fiduciario"
  }'

# 3. Verificar activos registrados
curl http://localhost:3001/api/assets?trustId=10045

# 4. Ver resumen del fideicomiso
curl http://localhost:3001/api/trusts/10045/summary
```

---

## Notas

- Todos los endpoints requieren `Content-Type: application/json` para POST/PUT
- La autenticación JWT está pendiente de implementar
- Los montos se manejan como Decimal (precisión para valores monetarios)
- Las fechas están en formato ISO 8601
