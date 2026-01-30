# fidufi Frontend

Frontend PWA para fidufi - Capa de cumplimiento técnico para fideicomisos irrevocables.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
yarn install

# Iniciar servidor de desarrollo
yarn dev

# El frontend estará disponible en http://localhost:3000
```

## 📁 Estructura

```
app/
├── src/
│   ├── components/        # Componentes reutilizables
│   │   ├── layout/        # Layout y navegación
│   │   └── ui/            # Componentes de shadcn/ui
│   ├── contexts/          # Contextos de React (Auth, etc.)
│   ├── lib/               # Utilidades y cliente API
│   ├── pages/             # Páginas de la aplicación
│   ├── App.tsx            # Componente principal
│   └── main.tsx           # Punto de entrada
├── public/                # Archivos estáticos
└── package.json
```

## 🎯 Funcionalidades Implementadas

### ✅ Autenticación
- Registro de actores con multi-identidad (DID, Ethereum, Polkadot)
- Login con JWT
- Manejo de tokens en localStorage
- Protección de rutas

### ✅ Páginas
- **Home** (`/`) - Página de inicio con dashboard
- **Onboarding** (`/onboard`, `/login`) - Registro de actores
- **Activos** (`/assets`) - Lista de activos del fideicomiso
- **Registro de Activos** (`/assets/register`) - Formulario para registrar nuevos activos
- **Alertas** (`/alerts`) - Lista de alertas del usuario

### ✅ Integración con Backend
- Cliente API con axios
- Interceptores para autenticación
- React Query para gestión de estado del servidor
- Manejo de errores

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` en `app/`:

```env
VITE_API_URL=http://localhost:3001
```

### Requisitos

- Node.js 18+
- Yarn 4.5.0+
- Backend corriendo en `http://localhost:3001`

## 📦 Tecnologías

- **React 19** - Framework UI
- **TypeScript** - Tipado estático
- **Vite 6** - Build tool
- **React Router 7** - Navegación
- **React Query** - Gestión de estado del servidor
- **Axios** - Cliente HTTP
- **Tailwind CSS v4** - Estilos
- **shadcn/ui** - Componentes UI
- **Lucide React** - Iconos

## 🎨 Componentes UI

Los componentes de shadcn/ui están en `src/components/ui/`:
- `button.tsx` - Botones
- `card.tsx` - Tarjetas
- `input.tsx` - Inputs

Para agregar más componentes:
```bash
npx shadcn@latest add [component-name]
```

## 🔐 Flujo de Autenticación

1. Usuario visita `/onboard` o `/login`
2. Completa formulario con identidad (DID, Ethereum, o Polkadot)
3. Backend retorna JWT y datos del actor
4. Token se guarda en localStorage
5. Usuario puede acceder a rutas protegidas

## 📱 PWA

La aplicación está configurada como PWA:
- Service Worker para offline
- Manifest para instalación
- Caché de assets

## 🧪 Desarrollo

```bash
# Modo desarrollo con hot-reload
yarn dev

# Build para producción
yarn build

# Preview del build
yarn preview
```

## 📝 Próximos Pasos

- [ ] Integración con Aura Wallet
- [ ] Verificación real de DIDs
- [ ] Mejoras en UX del formulario de activos
- [ ] Gráficos y visualizaciones
- [ ] Exportación de reportes
