# Despliegue fidufi: Railway + Vercel

- **Railway**: API (Express) + PostgreSQL (y opcionalmente el frontend).
- **Vercel**: Frontend (Vite/React) como estático.

Orden recomendado: **primero Railway** (para tener la URL del API), **después Vercel** (y apuntar la app a esa URL).

El repo es un **monorepo con Yarn workspaces** (`api` y `app`). No hace falta configurar Root Directory si usas los comandos por workspace.

---

## 1. Railway (API + base de datos)

### 1.1 Crear proyecto en Railway

1. Entra en [railway.app](https://railway.app) e inicia sesión (p. ej. con GitHub).
2. **New Project** → **Deploy from GitHub repo** y elige el repo `fidufi`.
3. Añade **PostgreSQL**: en el proyecto → **+ New** → **Database** → **PostgreSQL**. Railway crea el servicio y expone `DATABASE_URL` (conéctala al servicio API como referencia o cópiala).

### 1.2 Configurar el servicio de la API

1. En el mismo proyecto, **+ New** → **GitHub Repo** y elige el mismo repo (o un **Service** que use ese repo).
2. En el servicio de la **API** (no en Postgres):
   - **Root Directory**: déjalo vacío (se usa el repo completo con workspaces).
   - **Build Command**:  
     `yarn workspace @fidufi/api build`  
     (el script `build` del package `api` ejecuta primero `prisma generate` por `prebuild` y luego `tsc`).
   - **Start Command**:  
     `yarn workspace @fidufi/api start`  
     (el script `start` ejecuta primero `prisma migrate deploy` por `prestart` y luego `node dist/index.js`).
   - **Watch Paths**: `api/**` para redesplegar solo cuando cambie algo en `api/`.

### 1.3 Variables de entorno (API)

En el servicio de la API → **Variables**:

| Variable        | Origen / valor |
|----------------|-----------------|
| `DATABASE_URL` | Se inyecta solo si en **Variables** enlazas el servicio Postgres (Railway suele ofrecer “Add reference” / “Connect” a la base). Si no, cópiala desde el servicio Postgres. |
| `JWT_SECRET`   | Genera uno seguro (p. ej. `openssl rand -base64 32`) y pégalo. **Obligatorio en producción.** |
| `PORT`         | Railway suele inyectarlo; si no, pon `3001` o deja que el código use el default. |
| `NODE_ENV`     | `production` |

Opcionales (si usas esas funciones más adelante):

- `VC_ISSUER_DID`
- `POLYGON_ZKEVM_RPC_URL`, `POLYGON_ZKEVM_PRIVATE_KEY`
- `IPFS_GATEWAY_URL`

### 1.4 (Opcional) Servicio App en Railway

Si despliegas también el frontend en Railway (en lugar de Vercel):

- **Build Command**: `yarn workspace @fidufi/app build`
- **Start Command**: `yarn workspace @fidufi/app start`  
  **No uses** `yarn workspace @fidufi/app dev`: ese es el servidor de desarrollo. En producción debe usarse `start`, que sirve el build con `vite preview`.
- **Watch Paths**: `app/**`

### 1.5 Dominio público (API y App)

**Dónde ver o crear el dominio:** en cada servicio (API y App por separado):

1. Clic en el **servicio** (API o App) en el dashboard del proyecto.
2. Pestaña **Settings** (Configuración).
3. Baja hasta **Networking** / **Public Networking**.
4. Si no hay URL: **Generate Domain**. Railway asigna una URL tipo `https://nombre-servicio-xxxx.up.railway.app`.
5. La URL aparece ahí mismo; puedes copiarla.

Hazlo para el servicio **API** y, si desplegaste el front en Railway, también para el **App**. Anota la URL del API (p. ej. `https://fidufi-api-production-xxxx.up.railway.app`) para usarla en el frontend como `VITE_API_URL`.

Comprueba:

- `https://TU-DOMINIO/health` → debe devolver `{"status":"ok",...}`.
- Que `DATABASE_URL` esté definida y que las migraciones se apliquen (revisa los logs del primer deploy).

### 1.6 Si ves "DATABASE_URL no está definida"

El contenedor de la API falla al arrancar porque no tiene la variable. En Railway:

1. Entra al **servicio de la API** (el que hace build/start del backend), no al de Postgres.
2. Pestaña **Variables** → **"+ New Variable"** o **"Raw Editor"**.
3. Añade **`DATABASE_URL`**:
   - **Opción A:** Si tienes Postgres en el mismo proyecto, usa **"Add reference"** / **"Connect"** y elige la variable `DATABASE_URL` del servicio PostgreSQL.
   - **Opción B:** Entra al servicio **PostgreSQL** → **Variables**, copia el valor de `DATABASE_URL`, y en el servicio API crea una variable `DATABASE_URL` con ese valor.
4. Guarda; Railway redesplegará y el contenedor debería arrancar.

---

## 2. Vercel (Frontend)

### 2.1 Conectar el repo

1. Entra en [vercel.com](https://vercel.com) e inicia sesión (p. ej. con GitHub).
2. **Add New** → **Project** → importa el repo `fidufi`.

### 2.2 Configurar el proyecto (frontend)

En la configuración del proyecto:

- **Root Directory**: `app` (o **Edit** y pon `app`).
- **Framework Preset**: Vite (Vercel suele detectarlo).
- **Build Command**: `yarn build` (o `yarn install && yarn build` si no instala por defecto).
- **Output Directory**: `dist` (valor por defecto para Vite).
- **Install Command**: `yarn install`.

### 2.3 Variable de entorno (API pública)

En **Settings** → **Environment Variables** del proyecto Vercel:

| Name           | Value                    |
|----------------|--------------------------|
| `VITE_API_URL` | URL pública de Railway (p. ej. `https://fidufi-api-production-xxxx.up.railway.app`) **sin** barra final. |

Importante: en Vite las variables de build deben tener el prefijo `VITE_` para estar disponibles en el frontend.

### 2.4 SPA y rutas (React Router)

Para que todas las rutas sirvan `index.html`, en la raíz de **`app`** debe existir `vercel.json` con reenvío al `index.html` (ya incluido en este repo). Así el router del frontend funciona al recargar o abrir un enlace directo.

### 2.5 Deploy

Haz **Deploy**. La URL de Vercel (p. ej. `https://fidufi.vercel.app`) debe cargar la app y las llamadas a la API deben ir a la URL configurada en `VITE_API_URL`.

---

## 3. CORS

Si el frontend en Vercel y el API en Railway tienen orígenes distintos, el API debe permitir el origen del frontend. En `api/src/index.ts` ya tienes `cors()` sin opciones, que por defecto permite cualquier origen. Para producción puedes restringir:

```ts
app.use(cors({
  origin: [
    'https://tu-app.vercel.app',
    /\.vercel\.app$/,
  ],
  credentials: true,
}));
```

Ajusta el dominio a tu URL real de Vercel.

---

## 4. Resumen rápido

| Dónde   | Qué desplegar | Root      | Variable clave      |
|---------|----------------|-----------|----------------------|
| Railway | API + Postgres | `api`     | `DATABASE_URL`, `JWT_SECRET` |
| Vercel  | Frontend       | `app`     | `VITE_API_URL` = URL de Railway |

Orden: **Railway primero** → copiar URL del API → configurar **Vercel** con `VITE_API_URL` y desplegar.
