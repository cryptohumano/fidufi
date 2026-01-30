#!/bin/bash
# Prueba simple del flujo completo

BASE_URL="http://localhost:3001"

echo "🧪 Prueba Simple del Flujo Completo"
echo "===================================="

# 1. Registrar actor
echo -e "\n1. Registrando actor..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/actors/onboard" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fiduciario Test",
    "role": "FIDUCIARIO",
    "primaryDid": "did:kilt:test'$(date +%s)'"
  }')

echo "$RESPONSE" | jq .

# Extraer token y actor ID
TOKEN=$(echo "$RESPONSE" | jq -r '.token // empty')
ACTOR_ID=$(echo "$RESPONSE" | jq -r '.actor.id // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ] || [ "$TOKEN" = "" ]; then
    echo -e "\n❌ ERROR: No se recibió token"
    echo "Respuesta completa:"
    echo "$RESPONSE" | jq .
    exit 1
fi

echo -e "\n✅ Token recibido: ${TOKEN:0:50}..."
echo "✅ Actor ID: $ACTOR_ID"

# 2. Obtener actor actual
echo -e "\n2. Obteniendo actor actual con token..."
curl -s "$BASE_URL/api/actors/me" \
  -H "Authorization: Bearer $TOKEN" | jq '{id, name, role}'

# 3. Registrar activo
echo -e "\n3. Registrando activo..."
curl -s -X POST "$BASE_URL/api/assets/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trustId": "10045",
    "assetType": "GovernmentBond",
    "valueMxn": 5000000,
    "description": "Bono de prueba"
  }' | jq '{
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

echo -e "\n✅ Prueba completada"
