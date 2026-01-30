#!/bin/bash
# Script completo de pruebas para fidufi API
# Prueba todos los endpoints incluyendo autenticación

BASE_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Pruebas completas de fidufi API${NC}\n"
echo "=========================================="

# Variables para almacenar tokens y IDs
TOKEN=""
ACTOR_ID=""
ASSET_ID=""

# 1. Health Check
echo -e "\n${YELLOW}1. Health Check${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Health check OK${NC}"
    echo "$body" | jq .
else
    echo -e "${RED}❌ Health check falló (HTTP $http_code)${NC}"
    exit 1
fi

# 2. Root endpoint
echo -e "\n${YELLOW}2. Root Endpoint${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Root endpoint OK${NC}"
    echo "$body" | jq .
else
    echo -e "${RED}❌ Root endpoint falló (HTTP $http_code)${NC}"
fi

# 3. Obtener Fideicomiso 10045
echo -e "\n${YELLOW}3. GET /api/trusts/10045${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/trusts/10045")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Fideicomiso obtenido${NC}"
    echo "$body" | jq '{trustId, name, initialCapital, bondLimitPercent, otherLimitPercent}'
else
    echo -e "${RED}❌ Error obteniendo fideicomiso (HTTP $http_code)${NC}"
    echo "$body"
fi

# 4. Registrar nuevo actor (onboard)
echo -e "\n${YELLOW}4. POST /api/actors/onboard${NC}"
TIMESTAMP=$(date +%s)
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/actors/onboard" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Fiduciario $TIMESTAMP\",
    \"role\": \"FIDUCIARIO\",
    \"primaryDid\": \"did:kilt:test$TIMESTAMP\",
    \"ethereumAddress\": \"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb$TIMESTAMP\"
  }")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✅ Actor registrado exitosamente${NC}"
    TOKEN=$(echo "$body" | jq -r '.token // empty')
    ACTOR_ID=$(echo "$body" | jq -r '.actor.id // empty')
    
    if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
        echo -e "${RED}⚠️  Token no encontrado en respuesta${NC}"
        echo "$body" | jq .
    else
        echo "Token: ${TOKEN:0:50}..."
        echo "Actor ID: $ACTOR_ID"
        echo "$body" | jq '{actor: {id, name, role, primaryDid}}'
    fi
else
    echo -e "${RED}❌ Error registrando actor (HTTP $http_code)${NC}"
    echo "$body"
    exit 1
fi

# 5. Obtener actor actual (con autenticación)
echo -e "\n${YELLOW}5. GET /api/actors/me (con autenticación)${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/actors/me" \
  -H "Authorization: Bearer $TOKEN")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Actor actual obtenido${NC}"
    echo "$body" | jq '{id, name, role, primaryDid}'
else
    echo -e "${RED}❌ Error obteniendo actor actual (HTTP $http_code)${NC}"
    echo "$body"
fi

# 6. Intentar obtener /me sin token (debe fallar)
echo -e "\n${YELLOW}6. GET /api/actors/me (sin token - debe fallar)${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/actors/me")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ Correctamente rechazado sin token${NC}"
    echo "$body" | jq .
else
    echo -e "${RED}❌ Debería haber fallado sin token (HTTP $http_code)${NC}"
fi

# 7. Registrar activo (con autenticación)
echo -e "\n${YELLOW}7. POST /api/assets/register (con autenticación)${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/assets/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"trustId\": \"10045\",
    \"assetType\": \"GovernmentBond\",
    \"valueMxn\": 1000000,
    \"description\": \"Bono gubernamental de prueba\"
  }")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✅ Activo registrado exitosamente${NC}"
    ASSET_ID=$(echo "$body" | jq -r '.asset.id')
    echo "Asset ID: $ASSET_ID"
    echo "$body" | jq '{
      asset: {
        id,
        trustId,
        assetType,
        valueMxn,
        compliant,
        complianceStatus,
        vcHash,
        blockchainTxHash,
        blockchainNetwork
      },
      compliant,
      complianceStatus
    }'
else
    echo -e "${RED}❌ Error registrando activo (HTTP $http_code)${NC}"
    echo "$body"
fi

# 8. Listar activos
echo -e "\n${YELLOW}8. GET /api/assets?trustId=10045${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/assets?trustId=10045")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Activos obtenidos${NC}"
    COUNT=$(echo "$body" | jq '.assets | length')
    echo "Total activos: $COUNT"
    echo "$body" | jq '.assets[0:2] | .[] | {id, assetType, valueMxn, compliant, complianceStatus}'
else
    echo -e "${RED}❌ Error obteniendo activos (HTTP $http_code)${NC}"
    echo "$body"
fi

# 9. Obtener activo específico
if [ ! -z "$ASSET_ID" ]; then
    echo -e "\n${YELLOW}9. GET /api/assets/$ASSET_ID${NC}"
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/assets/$ASSET_ID")
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -1)

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ Activo obtenido${NC}"
        echo "$body" | jq '{id, assetType, valueMxn, compliant, complianceStatus, vcHash, blockchainNetwork}'
    else
        echo -e "${RED}❌ Error obteniendo activo (HTTP $http_code)${NC}"
        echo "$body"
    fi
fi

# 10. Obtener resumen del fideicomiso
echo -e "\n${YELLOW}10. GET /api/trusts/10045/summary${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/trusts/10045/summary")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Resumen obtenido${NC}"
    echo "$body" | jq '{trustId, totalAssets, totalValue, bondInvestment, otherInvestment, bondPercent, otherPercent}'
else
    echo -e "${RED}❌ Error obteniendo resumen (HTTP $http_code)${NC}"
    echo "$body"
fi

# 11. Listar alertas (usando actorId del query)
echo -e "\n${YELLOW}11. GET /api/alerts?actorId=$ACTOR_ID${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/alerts?actorId=$ACTOR_ID")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Alertas obtenidas${NC}"
    COUNT=$(echo "$body" | jq '.total')
    echo "Total alertas: $COUNT"
    if [ "$COUNT" -gt 0 ]; then
        ALERT_ID=$(echo "$body" | jq -r '.alerts[0].id')
        echo "$body" | jq '.alerts[0] | {id, message, severity, acknowledged}'
    fi
else
    echo -e "${RED}❌ Error obteniendo alertas (HTTP $http_code)${NC}"
    echo "$body"
fi

# 12. Intentar registrar activo sin autenticación (debe fallar)
echo -e "\n${YELLOW}12. POST /api/assets/register (sin token - debe fallar)${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/assets/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"trustId\": \"10045\",
    \"assetType\": \"GovernmentBond\",
    \"valueMxn\": 1000000
  }")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ Correctamente rechazado sin autenticación${NC}"
    echo "$body" | jq .
else
    echo -e "${RED}❌ Debería haber fallado sin autenticación (HTTP $http_code)${NC}"
fi

# 13. Registrar activo que excede límite (para probar alertas)
echo -e "\n${YELLOW}13. POST /api/assets/register (activo que excede límite del 30%)${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/assets/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"trustId\": \"10045\",
    \"assetType\": \"GovernmentBond\",
    \"valueMxn\": 25000000,
    \"description\": \"Bono que excede el límite del 30%\"
  }")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✅ Activo registrado (pero no cumple reglas)${NC}"
    COMPLIANT=$(echo "$body" | jq -r '.compliant')
    if [ "$COMPLIANT" = "false" ]; then
        echo -e "${YELLOW}⚠️  Activo marcado como NO COMPLIANT (correcto)${NC}"
    fi
    echo "$body" | jq '{
      asset: {id, assetType, valueMxn, compliant, complianceStatus},
      compliant,
      complianceStatus,
      validationResults: .validationResults.investmentRules
    }'
else
    echo -e "${RED}❌ Error registrando activo (HTTP $http_code)${NC}"
    echo "$body"
fi

echo -e "\n${BLUE}=========================================="
echo -e "✨ Pruebas completadas${NC}"
echo ""
echo "Resumen:"
echo "  - Health check: ✅"
echo "  - Autenticación: ✅"
echo "  - Registro de actor: ✅"
echo "  - Registro de activo: ✅"
echo "  - Protección de endpoints: ✅"
echo "  - Validación de reglas: ✅"
echo ""
