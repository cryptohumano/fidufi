# Configuración de Yarn + Tailwind CSS v4 + shadcn/ui

Este documento explica la configuración actualizada del proyecto para usar Yarn, Tailwind CSS v4 y shadcn/ui.

## Cambios Realizados

### 1. Migración a Yarn

- ✅ Configurado `.yarnrc.yml` para usar Yarn 4.5.0 (última versión estable)
- ✅ Actualizado `package.json` con `packageManager: "yarn@4.5.0"`
- ✅ Actualizados todos los scripts para usar `yarn` en lugar de `npm`

### 2. Tailwind CSS v4

Según la [documentación oficial de Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4):

- ✅ Instalado `tailwindcss@^4.1.0` y `@tailwindcss/vite@^4.1.0`
- ✅ Configurado plugin de Vite (`@tailwindcss/vite`) en `vite.config.ts`
- ✅ Actualizado `src/index.css` para usar `@import "tailwindcss"` (una sola línea)
- ✅ Eliminado `tailwind.config.js` (configuración CSS-first en v4)
- ✅ Eliminado `postcss.config.js` (no necesario con plugin de Vite)

**Características de Tailwind v4**:
- Motor de alto rendimiento (hasta 5x más rápido)
- Configuración CSS-first (usa `@theme` en lugar de JS)
- Detección automática de contenido
- Soporte nativo para container queries
- Utilidades 3D transform
- Gradientes mejorados (radial, conic)

### 3. Actualización de Versiones

#### React
- `react`: `^18.3.1` → `^19.0.0`
- `react-dom`: `^18.3.1` → `^19.0.0`
- `@types/react`: `^18.3.3` → `^19.0.0`
- `@types/react-dom`: `^18.3.0` → `^19.0.0`

#### Vite
- `vite`: `^5.3.0` → `^6.0.5`
- `@vitejs/plugin-react`: `^4.3.1` → `^4.3.4`

#### Otras Dependencias
- `react-router-dom`: `^6.22.0` → `^7.1.0`
- `@tanstack/react-query`: `^5.28.0` → `^5.62.0`
- `typescript`: `^5.5.0` → `^5.7.2`
- `lucide-react`: `^0.400.0` → `^0.468.0`

### 4. Configuración de shadcn/ui

Según la [documentación de shadcn/ui para Vite](https://ui.shadcn.com/docs/installation/vite):

- ✅ Actualizado `tsconfig.json` para usar estructura de archivos múltiples (vite estándar)
- ✅ Creado `tsconfig.app.json` con configuración de la app
- ✅ Configurado `vite.config.ts` con alias `@` para imports
- ✅ Agregado `@types/node` como dependencia

## Instalación

### 1. Habilitar Corepack (si no está habilitado)

```bash
corepack enable
corepack prepare yarn@4.5.0 --activate
```

### 2. Instalar Dependencias

```bash
# En la raíz del proyecto
yarn install

# O en cada workspace
cd app
yarn install
```

### 3. Configurar shadcn/ui

Después de instalar las dependencias, ejecuta:

```bash
cd app
yarn dlx shadcn@latest init
```

Esto te pedirá:
- Estilo de base de color (ej: Neutral, Slate, etc.)
- Color de base (ej: Neutral)
- Modo oscuro (ej: class)
- Ruta de componentes (ej: src/components/ui)
- Utilidades CSS (ej: src/lib/utils.ts)

### 4. Agregar Componentes de shadcn/ui

```bash
cd app
yarn dlx shadcn@latest add button
yarn dlx shadcn@latest add card
yarn dlx shadcn@latest add input
# etc.
```

## Estructura de Archivos TypeScript

Tailwind v4 con Vite requiere una estructura específica de TypeScript:

```
tsconfig.json          # Archivo raíz con referencias
tsconfig.app.json      # Configuración de la aplicación
tsconfig.node.json     # Configuración de Node (Vite)
```

## Configuración de Tailwind v4

### Antes (v3)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Ahora (v4)
```css
@import "tailwindcss";
```

### Configuración del Tema (v4)

En lugar de `tailwind.config.js`, ahora se configura en CSS:

```css
@theme {
  --color-primary: oklch(0.5 0.2 250);
  --spacing: 0.25rem;
  /* ... */
}
```

## Uso de Componentes shadcn/ui

Después de agregar componentes:

```tsx
import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <Button>Click me</Button>
    </div>
  )
}
```

## Comandos Útiles

```bash
# Desarrollo
yarn dev              # Raíz (ambos workspaces)
yarn workspace @fidufi/app dev    # Solo frontend
yarn workspace @fidufi/api dev    # Solo backend

# Build
yarn build            # Build de todos los workspaces

# Agregar componente shadcn/ui
cd app
yarn dlx shadcn@latest add [component-name]

# Actualizar dependencias
yarn upgrade-interactive
```

## Referencias

- [Tailwind CSS v4 Blog](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS v4 Installation with Vite](https://tailwindcss.com/docs/installation/using-vite)
- [shadcn/ui Installation](https://ui.shadcn.com/docs/installation)
- [shadcn/ui Vite Guide](https://ui.shadcn.com/docs/installation/vite)
- [Yarn Documentation](https://yarnpkg.com/getting-started)

## Notas Importantes

1. **Yarn 4**: Usa Yarn Berry (v4+) con `node-modules` linker por compatibilidad
2. **Tailwind v4**: No necesita PostCSS ni configuración JS, todo es CSS-first
3. **React 19**: Asegúrate de que todas las dependencias sean compatibles
4. **shadcn/ui**: Los componentes se copian a tu proyecto, no son un paquete npm

## Troubleshooting

### Error: "Cannot find module '@tailwindcss/vite'"

```bash
cd app
yarn add -D @tailwindcss/vite tailwindcss
```

### Error: "Yarn not found"

```bash
corepack enable
corepack prepare yarn@4.5.0 --activate
```

### Error: "shadcn init not working"

Asegúrate de estar en el directorio `app` y que Tailwind esté configurado correctamente.

---

**Última actualización**: 30 de enero de 2026
