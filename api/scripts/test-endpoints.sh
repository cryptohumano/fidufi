#!/bin/bash
# Script de pruebas para endpoints de fidufi API
# Ejecutar: bash scripts/test-endpoints.sh

BASE_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Probando endpoints de fidufi API...${NC}\n"

# 1. Health check
echo -e "${YELLOW}1. Health Check${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Health check OK${NC}"
    echo "$body" | jq .
else
    echo -e "${RED}❌ Health check falló (HTTP $http_code)${NC}"
fi
echo ""

# 2. Root endpoint
echo -e "${YELLOW}2. Root Endpoint${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Root endpoint OK${NC}"
    echo "$body" | jq .
else
    echo -e "${RED}❌ Root endpoint falló (HTTP $http_code)${NC}"
fi
echo ""

# 3. Obtener Fideicomiso 10045
echo -e "${YELLOW}3. GET /api/trusts/10045${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/trusts/10045")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Fideicomiso obtenido${NC}"
    echo "$body" | jq '{trustId, name, initialCapital, bondLimitPercent, otherLimitPercent}'
    TRUST_ID=$(echo "$body" | jq -r '.id')
    echo -e "   ID interno: ${TRUST_ID}"
else
    echo -e "${RED}❌ Error obteniendo fideicomiso (HTTP $http_code)${NC}"
    echo "$body"
fi
echo ""

# 4. Listar Actores
echo -e "${YELLOW}4. GET /api/actors${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/actors")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | tail -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Actores obtenidos${NC}"
    echo "$body" | jq 'length as $count | "Total: \($count) actores"'
    echo "$body" | jq '.[0:2] | .[] | {id, name, role}'
else
    echo -e "${RED}❌ Error obteniendo actores (HTTP $http_code)${NC}"
    echo "$body"
fi
echo ""

# 5. Listar Activos
echo -e "${YELLOW}5. GET /api/assets?trustId=10045${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/assets?trustId=10045")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Activos obtenidos${NC}"
    echo "$body" | jq 'length as $count | "Total: \($count) activos"'
else
    echo -e "${RED}❌ Error obteniendo activos (HTTP $http_code)${NC}"
    echo "$body"
fi
echo ""

# 6. Listar Alertas
echo -e "${YELLOW}6. GET /api/alerts${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/alerts")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Alertas obtenidas${NC}"
    echo "$body" | jq 'length as $count | "Total: \($count) alertas"'
else
    echo -e "${RED}❌ Error obteniendo alertas (HTTP $http_code)${NC}"
    echo "$body"
fi
echo ""

echo -e "${GREEN}✨ Pruebas completadas${NC}"
