# Sistema de Autenticación y Administración

## 🔐 Autenticación por Email

### Cambios Implementados

1. **Login separado de registro**
   - `/login` - Página de login con email y contraseña
   - `/onboard` - Solo para registro con identidades blockchain (opcional)

2. **Autenticación por email**
   - Los usuarios se autentican con email y contraseña
   - Las contraseñas se hashean con bcrypt
   - JWT se genera después del login exitoso

3. **Super Admin**
   - Rol `SUPER_ADMIN` agregado
   - Flag `isSuperAdmin` para protección especial
   - No puede ser eliminado si es el único Super Admin

## 👑 Super Administrador

### Credenciales por Defecto (Seed)

```
Email: admin@fidufi.mx
Contraseña: admin123
```

**⚠️ IMPORTANTE**: Cambiar estas credenciales en producción.

### Permisos del Super Admin

- ✅ Puede hacer TODO (bypass de todas las restricciones de roles)
- ✅ Crear, editar y eliminar usuarios
- ✅ Asignar cualquier rol
- ✅ Acceso al dashboard de administración
- ✅ No puede ser eliminado si es el último Super Admin

## 📋 Endpoints de Autenticación

### `POST /api/auth/login`
Login con email y contraseña.

**Body:**
```json
{
  "email": "admin@fidufi.mx",
  "password": "admin123"
}
```

**Response:**
```json
{
  "actor": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "SUPER_ADMIN",
    "isSuperAdmin": true
  },
  "token": "eyJhbGci..."
}
```

### `POST /api/auth/register`
Registro de nuevo usuario (solo Super Admin).

**Requiere:** Autenticación como Super Admin

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "name": "Nombre del Usuario",
  "role": "FIDUCIARIO"
}
```

## 🛡️ Endpoints de Administración

### `GET /api/admin/users`
Lista todos los usuarios (solo Super Admin).

### `POST /api/admin/users`
Crea un nuevo usuario (solo Super Admin).

### `PUT /api/admin/users/:id`
Actualiza un usuario (solo Super Admin).

### `DELETE /api/admin/users/:id`
Elimina un usuario (solo Super Admin).
- No puede eliminar Super Admin

## 🎯 Flujo de Usuario

### Usuario Normal
1. Visita `/login`
2. Ingresa email y contraseña
3. Obtiene JWT y acceso al sistema
4. Puede registrar activos (si es FIDUCIARIO/COMITE_TECNICO)
5. Puede ver alertas

### Super Admin
1. Visita `/login`
2. Ingresa email y contraseña del Super Admin
3. Accede al dashboard con opción "Admin" en navegación
4. Puede gestionar usuarios desde `/admin`
5. Puede hacer TODO en el sistema

## 🔒 Protecciones Implementadas

1. **Super Admin no puede ser eliminado** si es el último
2. **Super Admin puede hacer todo** (bypass de `authorize()`)
3. **Solo Super Admin puede crear usuarios**
4. **Contraseñas hasheadas** con bcrypt (10 rounds)
5. **Tokens JWT** con expiración configurable

## 📝 Próximos Pasos

- [ ] Configuración de identidades blockchain en Settings (futuro)
- [ ] Cambio de contraseña para usuarios
- [ ] Recuperación de contraseña
- [ ] Logs de auditoría de acciones del Super Admin
- [ ] Configuración de reglas desde el dashboard
