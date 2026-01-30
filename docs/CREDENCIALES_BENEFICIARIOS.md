# Credenciales de Beneficiarios - fidufi

## 👤 Beneficiarios (Fideicomisarios)

Los beneficiarios son los trabajadores que reciben beneficios del fideicomiso. Tienen acceso de solo lectura y reciben alertas automáticas cuando se registran activos que no cumplen con las reglas.

### Beneficiario 1
- **Email:** `beneficiario1@fidufi.mx`
- **Contraseña:** `beneficiario123`
- **Rol:** `BENEFICIARIO`
- **Nombre:** Trabajador Beneficiario 1
- **Fideicomiso asignado:** 10045

### Beneficiario 2
- **Email:** `beneficiario2@fidufi.mx`
- **Contraseña:** `beneficiario123`
- **Rol:** `BENEFICIARIO`
- **Nombre:** Trabajador Beneficiario 2
- **Fideicomiso asignado:** 10045

---

## ⚠️ Importante: Reiniciar el Servidor Backend

Si recibes un error al iniciar sesión con estas credenciales, es porque el servidor backend necesita reiniciarse después de agregar el nuevo rol `BENEFICIARIO`.

**Solución:**

1. Detén el servidor backend (Ctrl+C en la terminal donde corre)
2. Reinicia el servidor:
   ```bash
   cd api
   yarn dev
   ```

El servidor necesita reiniciarse para cargar el cliente de Prisma actualizado que incluye el nuevo valor del enum `BENEFICIARIO`.

---

## Funcionalidades de Beneficiarios

- ✅ Ver alertas sobre activos del fideicomiso
- ✅ Ver resumen del fideicomiso (solo lectura)
- ✅ Consultar información de activos asignados
- ❌ No pueden registrar activos
- ❌ No pueden modificar reglas

---

## Notas

- Los beneficiarios están asignados automáticamente al fideicomiso 10045 mediante el seed
- Reciben alertas automáticas cuando se registran activos que no cumplen con las reglas
- El dashboard específico para beneficiarios está pendiente de implementación
