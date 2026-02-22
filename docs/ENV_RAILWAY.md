# Variables de entorno por servicio en Railway

Configura estas variables en cada servicio desde **Variables** (o **Raw Editor**).

---

## Servicio **API** (backend)

| Variable        | ¿Obligatoria? | Valor / notas |
|----------------|----------------|----------------|
| `DATABASE_URL` | **Sí**         | Referencia al Postgres de Railway (Add reference → variable `DATABASE_URL` del servicio PostgreSQL) o copiar/pegar la URL desde el servicio Postgres. |
| `JWT_SECRET`   | **Sí**         | String aleatorio seguro. En local: `openssl rand -base64 32`. Nunca uses el valor por defecto en producción. |
| `PORT`         | No             | Railway la inyecta; no hace falta definirla. |
| `NODE_ENV`     | Recomendada    | `production` |
| `JWT_EXPIRES_IN` | No           | Ej: `7d`. Por defecto el código usa `7d`. |

**Opcionales** (solo si usas esas funciones):

| Variable                     | Uso |
|-----------------------------|-----|
| `VC_ISSUER_DID`             | Emisor de credenciales verificables (default: `did:fidufi:issuer`). |
| `POLYGON_ZKEVM_RPC_URL`     | RPC de Polygon zkEVM (blockchain). |
| `POLYGON_ZKEVM_PRIVATE_KEY` | Clave privada para blockchain. |
| `IPFS_GATEWAY_URL`          | Gateway IPFS (default: `https://ipfs.io/ipfs/`). |

---

## Servicio **App** (frontend)

| Variable         | ¿Obligatoria? | Valor / notas |
|------------------|----------------|----------------|
| `VITE_API_URL`   | **Sí**         | URL pública del servicio **API** en Railway, **sin** barra final. Ej: `https://fidufi-api-production-xxxx.up.railway.app` |
| `PORT`           | No             | Railway la inyecta; no hace falta definirla. |

Importante: en Vite las variables que debe ver el frontend tienen que empezar por `VITE_`. Se usan en **build time**; si cambias `VITE_API_URL` hay que volver a desplegar (nuevo build) para que se aplique.

---

## Resumen rápido

| Servicio | Variables obligatorias |
|----------|-------------------------|
| **API**  | `DATABASE_URL`, `JWT_SECRET` |
| **App**  | `VITE_API_URL` (URL del API en Railway) |
