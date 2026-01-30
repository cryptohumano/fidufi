# Configuración de Yarn con Corepack

## Problema Común

Si ves el error:
```
Error: ENOENT: no such file or directory, stat '/home/edgar/fidufi/.yarn/releases/yarn-4.5.0.cjs'
```

Esto significa que Yarn está buscando un binario que no existe en el repositorio.

## Solución: Usar Corepack

Corepack es la forma recomendada de manejar Yarn en proyectos modernos. No necesitas tener el binario de Yarn en el repositorio.

### Paso 1: Habilitar Corepack

```bash
# Habilitar corepack (solo una vez por sistema)
corepack enable

# Preparar Yarn 4.5.0
corepack prepare yarn@4.5.0 --activate

# Verificar versión
yarn --version
# Debería mostrar: 4.5.0
```

### Paso 2: Configurar .yarnrc.yml

El archivo `.yarnrc.yml` NO debe tener `yarnPath` especificado cuando usas corepack:

```yaml
# ✅ Correcto (con corepack)
nodeLinker: node-modules

# ❌ Incorrecto (sin corepack)
# yarnPath: .yarn/releases/yarn-4.5.0.cjs
```

### Paso 3: Verificar package.json

Asegúrate de que `package.json` tenga el campo `packageManager`:

```json
{
  "packageManager": "yarn@4.5.0"
}
```

### Paso 4: Instalar Dependencias

```bash
yarn install
```

## Alternativa: Descargar Binario Manualmente

Si por alguna razón no puedes usar corepack, puedes descargar el binario manualmente:

```bash
# Crear directorio
mkdir -p .yarn/releases

# Descargar Yarn 4.5.0
curl -o .yarn/releases/yarn-4.5.0.cjs https://github.com/yarnpkg/berry/releases/download/yarn-4.5.0/yarn-4.5.0.cjs

# Hacer ejecutable
chmod +x .yarn/releases/yarn-4.5.0.cjs

# Actualizar .yarnrc.yml para usar el binario
```

Pero **recomendamos usar corepack** ya que es más simple y no requiere commitear binarios al repositorio.

## Verificación

Después de configurar corepack:

```bash
# Verificar que corepack está habilitado
corepack --version

# Verificar versión de Yarn
yarn --version

# Debería mostrar: 4.5.0
```

## Troubleshooting

### "corepack: command not found"

Corepack viene con Node.js 16.9+. Si no lo tienes:

```bash
# Actualizar Node.js a la última versión LTS
# O instalar corepack manualmente:
npm install -g corepack
```

### "Yarn version mismatch"

```bash
# Forzar preparación de la versión correcta
corepack prepare yarn@4.5.0 --activate --force
```

### "Permission denied"

```bash
# En Linux/Mac, puede necesitar sudo (solo una vez)
sudo corepack enable
```

---

**Recomendación**: Siempre usa corepack para manejar Yarn. Es la forma oficial y más mantenible.
