# Credenciales de Usuarios - fidufi

## 👑 Super Administrador

**Email:** `admin@fidufi.mx`  
**Contraseña:** `admin123`  
**Rol:** `SUPER_ADMIN`  
**Dashboard:** `/admin`  
**Funcionalidades:** Gestión completa de usuarios, acceso a todos los dashboards

---

## 🏦 Fiduciario

**Email:** `fiduciario@fidufi.mx`  
**Contraseña:** `fiduciario123`  
**Rol:** `FIDUCIARIO`  
**Dashboard:** `/dashboard/fiduciario`  
**Funcionalidades:** 
- Registrar activos
- Ver activos registrados
- Ver alertas
- Ver resumen del fideicomiso

---

## 👥 Comité Técnico

### Miembro 1
**Email:** `guillermo.tellez@fidufi.mx`  
**Contraseña:** `comite123`  
**Rol:** `COMITE_TECNICO`  
**Dashboard:** `/dashboard/comite-tecnico`

### Miembro 2
**Email:** `octavio.ferrer@fidufi.mx`  
**Contraseña:** `comite123`  
**Rol:** `COMITE_TECNICO`  
**Dashboard:** `/dashboard/comite-tecnico`

### Miembro 3
**Email:** `alejandro.frigolet@fidufi.mx`  
**Contraseña:** `comite123`  
**Rol:** `COMITE_TECNICO`  
**Dashboard:** `/dashboard/comite-tecnico`

**Funcionalidades:**
- Registrar activos
- Ver todos los activos con detalles
- Revisar alertas
- Ver resumen completo del fideicomiso
- Aprobar excepciones (próximamente)

---

## 🔍 Auditor

**Email:** `auditor@fidufi.mx`  
**Contraseña:** `auditor123`  
**Rol:** `AUDITOR`  
**Dashboard:** `/dashboard/auditor`  
**Funcionalidades:** 
- Ver todos los activos (solo lectura)
- Ver todas las alertas
- Ver detalles del fideicomiso
- Exportar reportes (próximamente)

---

## 🛡️ Regulador

**Email:** `regulador@fidufi.mx`  
**Contraseña:** `regulador123`  
**Rol:** `REGULADOR`  
**Dashboard:** `/dashboard/regulador`  
**Funcionalidades:**
- Ver todos los activos (solo lectura)
- Ver análisis de cumplimiento regulatorio
- Ver alertas e incumplimientos
- Exportar reportes regulatorios (próximamente)

---

## 👤 Beneficiarios (Fideicomisarios)

### Beneficiario 1
**Email:** `beneficiario1@fidufi.mx`  
**Contraseña:** `beneficiario123`  
**Rol:** `BENEFICIARIO`  
**Dashboard:** `/dashboard/beneficiario` (próximamente)  
**Funcionalidades:**
- Ver alertas sobre activos del fideicomiso
- Ver resumen del fideicomiso (solo lectura)
- Consultar información de activos asignados

### Beneficiario 2
**Email:** `beneficiario2@fidufi.mx`  
**Contraseña:** `beneficiario123`  
**Rol:** `BENEFICIARIO`  
**Dashboard:** `/dashboard/beneficiario` (próximamente)  
**Funcionalidades:**
- Ver alertas sobre activos del fideicomiso
- Ver resumen del fideicomiso (solo lectura)
- Consultar información de activos asignados

**Nota:** Los beneficiarios están asignados al fideicomiso 10045 y reciben alertas automáticas cuando se registran activos que no cumplen con las reglas.

---

## 📝 Notas

- Todos los usuarios pueden iniciar sesión con email y contraseña
- Cada rol tiene su propio dashboard personalizado
- Los dashboards se muestran automáticamente al iniciar sesión según el rol
- El Super Admin puede gestionar usuarios desde `/admin`
- Las contraseñas son simples para desarrollo; cambiar en producción

---

## 🔄 Redirección Automática

Al iniciar sesión, los usuarios son redirigidos automáticamente a su dashboard correspondiente:

- `SUPER_ADMIN` → `/admin`
- `FIDUCIARIO` → `/dashboard/fiduciario`
- `COMITE_TECNICO` → `/dashboard/comite-tecnico`
- `AUDITOR` → `/dashboard/auditor`
- `REGULADOR` → `/dashboard/regulador`
