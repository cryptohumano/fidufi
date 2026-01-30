#!/bin/bash
# Prueba del flujo completo incluyendo pago de honorarios

BASE_URL="http://localhost:3001"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 Prueba del Flujo Completo${NC}\n"

# 1. Registrar actor y obtener token
echo -e "${YELLOW}1. Registrando actor...${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/actors/onboard" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Fiduciario Test $(date +%s)\",
    \"role\": \"FIDUCIARIO\",
    \"primaryDid\": \"did:kilt:test$(date +%s)\"
  }")

TOKEN=$(echo "$RESPONSE" | jq -r '.token')
ACTOR_ID=$(echo "$RESPONSE" | jq -r '.actor.id')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Error: No se recibió token"
    exit 1
fi

echo -e "${GREEN}✅ Actor registrado: $ACTOR_ID${NC}"
echo "Token: ${TOKEN:0:50}..."

# 2. Pagar honorarios del fiduciario (simulado - en producción sería otro endpoint)
echo -e "\n${YELLOW}2. Pagando honorarios del fiduciario...${NC}"
echo -e "${BLUE}ℹ️  Nota: En producción esto se haría mediante otro endpoint${NC}"
echo -e "${BLUE}ℹ️  Por ahora, los honorarios están configurados en el seed${NC}"

# 3. Registrar activo pequeño (dentro del límite)
echo -e "\n${YELLOW}3. Registrando activo (dentro del límite del 30%)...${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/assets/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trustId": "10045",
    "assetType": "GovernmentBond",
    "valueMxn": 1000000,
    "description": "Bono gubernamental de prueba"
  }')

HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" -X POST "$BASE_URL/api/assets/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trustId": "10045",
    "assetType": "GovernmentBond",
    "valueMxn": 1000000,
    "description": "Bono gubernamental de prueba"
  }')

if [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✅ Activo registrado exitosamente${NC}"
    cat /tmp/response.json | jq '{
      compliant,
      complianceStatus,
      asset: {
        id,
        assetType,
        valueMxn,
        vcHash,
        blockchainNetwork
      }
    }'
else
    echo -e "${YELLOW}⚠️  Error registrando activo (HTTP $HTTP_CODE)${NC}"
    cat /tmp/response.json | jq .
    echo -e "\n${BLUE}ℹ️  Esto es esperado si faltan pagos de honorarios${NC}"
fi

# 4. Obtener resumen del fideicomiso
echo -e "\n${YELLOW}4. Resumen del fideicomiso...${NC}"
curl -s "$BASE_URL/api/trusts/10045/summary" | jq '{
  trustId,
  totalAssets,
  totalValue,
  bondInvestment,
  otherInvestment,
  bondPercent,
  otherPercent
}'

# 5. Listar activos
echo -e "\n${YELLOW}5. Listando activos...${NC}"
ASSETS=$(curl -s "$BASE_URL/api/assets?trustId=10045")
COUNT=$(echo "$ASSETS" | jq '.assets | length')
echo "Total activos: $COUNT"
if [ "$COUNT" -gt 0 ]; then
    echo "$ASSETS" | jq '.assets[] | {id, assetType, valueMxn, compliant, complianceStatus}'
fi

echo -e "\n${BLUE}✨ Prueba completada${NC}"
