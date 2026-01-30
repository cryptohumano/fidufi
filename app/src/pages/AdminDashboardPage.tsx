/**
 * Dashboard de administración (solo Super Admin)
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Plus, Edit, Trash2, User, Mail, TrendingUp, FileText, DollarSign, Users } from 'lucide-react';
import { ActorRole } from '../lib/api';

function AdminDashboard() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'FIDUCIARIO' as ActorRole,
  });

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      try {
        const result = await adminApi.getUsers();
        console.log('✅ Usuarios cargados:', result);
        return result;
      } catch (err) {
        console.error('❌ Error al cargar usuarios:', err);
        throw err;
      }
    },
    retry: 1,
  });

  // Debug: verificar estado del actor
  console.log('🔍 AdminDashboard - Actor:', actor);
  console.log('🔍 AdminDashboard - isSuperAdmin:', actor?.role === 'SUPER_ADMIN' || actor?.isSuperAdmin);

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowCreateForm(false);
      setFormData({ email: '', password: '', name: '', role: 'FIDUCIARIO' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const isSuperAdmin = actor?.role === 'SUPER_ADMIN' || actor?.isSuperAdmin;

  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
          <p className="text-muted-foreground">
            Solo el Super Administrador puede acceder a esta página.
          </p>
        </Card>
      </div>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdate = (id: string) => {
    updateMutation.mutate({
      id,
      data: {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
          <p className="text-muted-foreground">Gestiona usuarios y configuración del sistema</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Usuario
        </Button>
      </div>

      {/* Estadísticas del Sistema */}
      {stats && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Usuarios</h3>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stats.totalUsers || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalTrusts || 0} fideicomiso(s) activo(s)
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Activos Digitalizados</h3>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stats.totalAssets || 0}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Valor Cumpliente</h3>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">
              ${parseFloat(stats.totalCompliantAssetsValue || '0').toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Solo activos que cumplen
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Usuarios Activos</h3>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">
              {Object.values(stats.activeUsersByRole || {}).reduce((a, b) => a + b, 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Con credenciales de acceso
            </p>
          </Card>
        </div>
      )}

      {/* Usuarios por Rol */}
      {stats && stats.usersByRole && (
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Usuarios por Rol</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(stats.usersByRole).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between p-3 border rounded-md">
                <span className="text-sm font-medium capitalize">
                  {role.replace('_', ' ').toLowerCase()}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{count}</span>
                  {stats.activeUsersByRole?.[role] !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      ({stats.activeUsersByRole[role]} activos)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showCreateForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Crear Nuevo Usuario</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Contraseña</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nombre</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as ActorRole })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="FIDUCIARIO">Fiduciario</option>
                  <option value="COMITE_TECNICO">Comité Técnico</option>
                  <option value="AUDITOR">Auditor</option>
                  <option value="REGULADOR">Regulador</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando...' : 'Crear Usuario'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Usuarios del Sistema</h2>
        {error ? (
          <div className="text-center py-8">
            <div className="text-destructive mb-2">Error al cargar usuarios</div>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })}
            >
              Reintentar
            </Button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Cargando usuarios...</p>
          </div>
        ) : !users || users.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay usuarios registrados aún.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Usa el botón "Crear Usuario" para agregar el primer usuario.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user: any) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{user.name || 'Sin nombre'}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{user.email || 'Sin email'}</span>
                      <span>•</span>
                      <span className="capitalize">{user.role.replace('_', ' ').toLowerCase()}</span>
                      {user.isSuperAdmin && (
                        <>
                          <span>•</span>
                          <span className="text-yellow-600 dark:text-yellow-500 font-semibold">Super Admin</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!user.isSuperAdmin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                        title="Editar usuario"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('¿Estás seguro de eliminar este usuario?')) {
                            deleteMutation.mutate(user.id);
                          }
                        }}
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {user.isSuperAdmin && (
                    <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                      Protegido
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole="SUPER_ADMIN">
      <AdminDashboard />
    </ProtectedRoute>
  );
}
