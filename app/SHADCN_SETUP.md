# Guía de Configuración de shadcn/ui

## 🚀 Inicialización de shadcn/ui

### Paso 1: Asegurar que Tailwind v4 esté configurado

Antes de inicializar shadcn/ui, asegúrate de que:
- ✅ Tailwind CSS v4 está instalado (`tailwindcss@^4.1.0` y `@tailwindcss/vite@^4.1.0`)
- ✅ El plugin de Vite está configurado en `vite.config.ts`
- ✅ `src/index.css` tiene `@import "tailwindcss"`

### Paso 2: Inicializar shadcn/ui

Desde el directorio `app/`, ejecuta:

```bash
cd app
yarn dlx shadcn@latest init
```

### Paso 3: Responder las preguntas del CLI

El CLI te hará varias preguntas:

1. **Which style would you like to use?**
   - `New York` (recomendado) o `Default`
   - Presiona Enter para usar el predeterminado

2. **Which color would you like to use as base color?**
   - Opciones: `slate`, `gray`, `zinc`, `neutral`, `stone`
   - Recomendado: `neutral`

3. **Would you like to use CSS variables for colors?**
   - `yes` (recomendado para Tailwind v4)

4. **Where is your global CSS file?**
   - `src/index.css` (presiona Enter si es el predeterminado)

5. **Would you like to use CSS variables for colors?**
   - `yes`

6. **Are you using a custom tailwind prefix?**
   - `no` (presiona Enter)

7. **Where is your tailwind.config.js located?**
   - Como estamos usando Tailwind v4, esto NO aplica. Presiona Enter.

8. **Configure the import alias for components?**
   - `@/components` (presiona Enter)

9. **Configure the import alias for utils?**
   - `@/lib/utils` (presiona Enter)

10. **Are you using React Server Components?**
    - `no` (para Vite + React)

### Paso 4: Verificar la configuración

Después de `init`, se creará `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

## 📦 Agregar Componentes

Después de inicializar, puedes agregar componentes:

```bash
# Componentes básicos
yarn dlx shadcn@latest add button
yarn dlx shadcn@latest add card
yarn dlx shadcn@latest add input
yarn dlx shadcn@latest add form
yarn dlx shadcn@latest add label

# Más componentes útiles
yarn dlx shadcn@latest add dialog
yarn dlx shadcn@latest add dropdown-menu
yarn dlx shadcn@latest add table
yarn dlx shadcn@latest add toast
```

## 🎨 Usar Componentes

Después de agregar componentes, úsalos así:

```tsx
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

function MyComponent() {
  return (
    <Card>
      <Button>Click me</Button>
    </Card>
  )
}
```

## 🔧 Configuración con Tailwind v4

shadcn/ui funciona con Tailwind v4 usando:

1. **Variables CSS en `@theme`**: Los colores se definen en `@theme` en `index.css`
2. **Variables CSS adicionales**: Se mantienen variables HSL para compatibilidad
3. **Sin `tailwind.config.js`**: Todo se configura en CSS

## ⚠️ Solución de Problemas

### Error: "Cannot apply unknown utility class `border-border`"

Esto significa que los colores no están definidos correctamente en `@theme`. Asegúrate de que:

1. Los colores estén definidos en `@theme` con el prefijo `--color-`
2. Las variables CSS estén definidas en `:root` y `.dark`
3. El CSS use `hsl(var(--border))` en lugar de `@apply border-border`

### Error: "shadcn init not working"

Asegúrate de:
1. Estar en el directorio `app/`
2. Tener Tailwind v4 instalado
3. Tener `src/index.css` con `@import "tailwindcss"`

### Los componentes no se ven bien

Verifica que:
1. `src/index.css` esté importado en `main.tsx` o `App.tsx`
2. Las variables CSS estén definidas correctamente
3. El modo oscuro funcione si lo estás usando

## 📚 Referencias

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [shadcn/ui con Vite](https://ui.shadcn.com/docs/installation/vite)
- [shadcn/ui con Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
