import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, FormEvent } from 'react';
import { trustsApi, adminApi, actorTrustApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Users, Building2, X, Check, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../components/ui/dialog';

const ROLE_LABELS: Record<string, string> = {
  FIDUCIARIO: 'Fiduciario',
  COMITE_TECNICO: 'Comité Técnico',
  AUDITOR: 'Auditor',
  REGULADOR: 'Regulador',
};

export function TrustsManagementPage() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedTrust, setSelectedTrust] = useState<string>('');

  const { data: trusts, isLoading: trustsLoading } = useQuery({
    queryKey: ['trusts'],
    queryFn: () => trustsApi.list(),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => adminApi.getUsers(),
    enabled: !!actor?.isSuperAdmin,
  });

  const createTrustMutation = useMutation({
    mutationFn: (data: {
      name?: string;
      initialCapital: number;
      bondLimitPercent?: number;
      otherLimitPercent?: number;
    }) => {
      console.log('📤 Enviando datos al backend:', data);
      return trustsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trusts'] });
      setShowCreateDialog(false);
    },
    onError: (error: any) => {
      console.error('❌ Error creando fideicomiso:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Error al crear el fideicomiso';
      console.error('📋 Detalles del error:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: errorMessage,
      });
      alert(`Error: ${errorMessage}`);
    },
  });

  const assignActorMutation = useMutation({
    mutationFn: (data: { actorId: string; trustId: string; roleInTrust: string }) =>
      actorTrustApi.assignActor(data),
    onSuccess: () => {
      // Invalidar todas las queries relacionadas para que se actualicen los dashboards
      queryClient.invalidateQueries({ queryKey: ['trusts'] });
      queryClient.invalidateQueries({ queryKey: ['actor-trust'] });
      queryClient.invalidateQueries({ queryKey: ['trust-actors', selectedTrust] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      // No cerrar el diálogo para permitir múltiples asignaciones
    },
  });

  if (trustsLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Fideicomisos</h1>
          <p className="text-muted-foreground mt-2">
            Crear y administrar fideicomisos y asignar usuarios
          </p>
        </div>
        {actor?.isSuperAdmin && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Fideicomiso
          </Button>
        )}
      </div>

      {/* Lista de fideicomisos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trusts?.map((trust: any) => (
          <Card key={trust.trustId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {trust.trustId}
                </CardTitle>
                {trust.active ? (
                  <Badge variant="default">Activo</Badge>
                ) : (
                  <Badge variant="secondary">Inactivo</Badge>
                )}
              </div>
              {trust.name && <p className="text-sm text-muted-foreground mt-1">{trust.name}</p>}
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Patrimonio inicial: </span>
                  <span className="font-semibold">
                    ${parseFloat(trust.initialCapital).toLocaleString('es-MX')} MXN
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Límite bonos: </span>
                  <span className="font-semibold">{trust.bondLimitPercent}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Límite otros: </span>
                  <span className="font-semibold">{trust.otherLimitPercent}%</span>
                </div>
              </div>
              {actor?.isSuperAdmin && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => {
                    setSelectedTrust(trust.trustId);
                    setShowAssignDialog(true);
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Asignar Usuarios
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog para crear fideicomiso */}
      {showCreateDialog && (
        <CreateTrustDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreate={createTrustMutation.mutate}
          isLoading={createTrustMutation.isPending}
        />
      )}

      {/* Dialog para asignar usuarios */}
      {showAssignDialog && selectedTrust && (
        <AssignUsersDialog
          open={showAssignDialog}
          onOpenChange={(open) => {
            setShowAssignDialog(open);
            if (!open) {
              setSelectedTrust('');
            }
          }}
          trustId={selectedTrust}
          users={users || []}
          onAssign={(data) => {
            assignActorMutation.mutate(data);
          }}
          isLoading={assignActorMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateTrustDialog({
  open,
  onOpenChange,
  onCreate,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    initialCapital: '',
    bondLimitPercent: '30',
    otherLimitPercent: '70',
    constitutionDate: '',
    maxTermYears: '30',
    termType: 'STANDARD' as 'STANDARD' | 'FOREIGN' | 'DISABILITY',
  });

  // Resetear formulario cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      setFormData({
        name: '',
        initialCapital: '',
        bondLimitPercent: '30',
        otherLimitPercent: '70',
        constitutionDate: today,
        maxTermYears: '30',
        termType: 'STANDARD',
      });
    }
  }, [open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Validar que initialCapital esté presente y sea válido
    if (!formData.initialCapital || isNaN(parseFloat(formData.initialCapital))) {
      alert('Por favor ingrese un patrimonio inicial válido');
      return;
    }
    
    const initialCapitalValue = parseFloat(formData.initialCapital);
    if (initialCapitalValue <= 0) {
      alert('El patrimonio inicial debe ser mayor a cero');
      return;
    }
    
    // Validar fecha de constitución
    if (!formData.constitutionDate) {
      alert('Por favor ingrese la fecha de constitución');
      return;
    }

    const maxTermYearsValue = parseInt(formData.maxTermYears);
    if (isNaN(maxTermYearsValue) || maxTermYearsValue < 1 || maxTermYearsValue > 99) {
      alert('El plazo máximo debe estar entre 1 y 99 años');
      return;
    }

    onCreate({
      // trustId se genera automáticamente en el backend
      name: formData.name || undefined,
      initialCapital: initialCapitalValue,
      bondLimitPercent: formData.bondLimitPercent ? parseFloat(formData.bondLimitPercent) : undefined,
      otherLimitPercent: formData.otherLimitPercent ? parseFloat(formData.otherLimitPercent) : undefined,
      constitutionDate: formData.constitutionDate,
      maxTermYears: maxTermYearsValue,
      termType: formData.termType,
      requiresConsensus: formData.requiresConsensus,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Crear Nuevo Fideicomiso</DialogTitle>
        </DialogHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> El ID del fideicomiso se generará automáticamente al crear el registro.
              El formato será: <code className="text-xs bg-background px-1 py-0.5 rounded">YYYY-NNNN</code> (ej: 2026-0001)
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Nombre (opcional)</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 border rounded-md"
              placeholder="Nombre descriptivo del fideicomiso"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Patrimonio Inicial (MXN) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.initialCapital}
              onChange={(e) => setFormData({ ...formData, initialCapital: e.target.value })}
              required
              className="w-full p-2 border rounded-md"
              placeholder="68500000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Límite Bonos (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.bondLimitPercent}
                onChange={(e) => setFormData({ ...formData, bondLimitPercent: e.target.value })}
                className="w-full p-2 border rounded-md"
                placeholder="30"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Límite Otros (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.otherLimitPercent}
                onChange={(e) => setFormData({ ...formData, otherLimitPercent: e.target.value })}
                className="w-full p-2 border rounded-md"
                placeholder="70"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Plazos y Vigencia</h3>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Fecha de Constitución <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.constitutionDate}
                onChange={(e) => setFormData({ ...formData, constitutionDate: e.target.value })}
                required
                className="w-full p-2 border rounded-md"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Fecha en que se constituye el contrato de fideicomiso
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Plazo Máximo (años) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={formData.maxTermYears}
                  onChange={(e) => setFormData({ ...formData, maxTermYears: e.target.value })}
                  required
                  className="w-full p-2 border rounded-md"
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Máximo: 99 años
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Tipo de Plazo <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.termType}
                  onChange={(e) => setFormData({ ...formData, termType: e.target.value as any })}
                  required
                  className="w-full p-2 border rounded-md"
                >
                  <option value="STANDARD">Estándar (30 años)</option>
                  <option value="FOREIGN">Zona Restringida (50 años)</option>
                  <option value="DISABILITY">Incapacidad (70 años)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.termType === 'STANDARD' && 'Plazo estándar para fideicomisos nacionales'}
                  {formData.termType === 'FOREIGN' && 'Plazo extendido para fideicomisos con extranjeros'}
                  {formData.termType === 'DISABILITY' && 'Plazo extendido para casos de incapacidad'}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="requiresConsensus"
                  checked={formData.requiresConsensus}
                  onChange={(e) => setFormData({ ...formData, requiresConsensus: e.target.checked })}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="requiresConsensus" className="text-sm font-medium block">
                    Requiere Consenso del Comité Técnico
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Si está activado, las excepciones requieren mayoría (2 de 3 miembros) para ser aprobadas.
                    Si está desactivado, un solo miembro puede aprobar/rechazar excepciones.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creando...' : 'Crear Fideicomiso'}
            </Button>
          </div>
        </form>
        </CardContent>
      </DialogContent>
    </Dialog>
  );
}

function AssignUsersDialog({
  open,
  onOpenChange,
  trustId,
  users,
  onAssign,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trustId: string;
  users: any[];
  onAssign: (data: any) => void;
  isLoading: boolean;
}) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('FIDUCIARIO');

  const { data: trustActors } = useQuery({
    queryKey: ['trust-actors', trustId],
    queryFn: () => actorTrustApi.getTrustActors(trustId),
    enabled: open && !!trustId,
  });

  const assignedActorIds = new Set((trustActors || []).map((a: any) => a.actorId));

  // Filtrar usuarios que no son beneficiarios y que no están ya asignados
  const availableUsers = users.filter(
    (user) => user.role !== 'BENEFICIARIO' && !assignedActorIds.has(user.id)
  );

  const handleAssign = () => {
    if (!selectedUserId) return;
    onAssign({
      actorId: selectedUserId,
      trustId,
      roleInTrust: selectedRole,
    });
    // Limpiar selección después de asignar para permitir otra asignación
    setSelectedUserId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Asignar Usuarios al Fideicomiso {trustId}</DialogTitle>
        </DialogHeader>
        <CardContent>
          <div className="space-y-6">
          {/* Formulario de asignación */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Usuario <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Seleccionar usuario</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email} ({user.role})
                  </option>
                ))}
              </select>
              {availableUsers.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Todos los usuarios disponibles ya están asignados o son beneficiarios
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Rol en el Fideicomiso <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Nota: Los beneficiarios se asignan automáticamente al crear activos
              </p>
            </div>

            <Button onClick={handleAssign} disabled={!selectedUserId || isLoading} className="w-full">
              {isLoading ? 'Asignando...' : 'Asignar Usuario'}
            </Button>
          </div>

          {/* Lista de usuarios asignados */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Usuarios Asignados</h3>
            {trustActors && trustActors.length > 0 ? (
              <div className="space-y-2">
                {trustActors.map((membership: any) => {
                  const user = users.find((u) => u.id === membership.actorId);
                  return (
                    <div
                      key={membership.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div>
                        <div className="font-medium">{user?.name || user?.email || 'Usuario'}</div>
                        <div className="text-sm text-muted-foreground">
                          {ROLE_LABELS[membership.roleInTrust] || membership.roleInTrust}
                        </div>
                      </div>
                      <Badge variant={membership.active ? 'default' : 'secondary'}>
                        {membership.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay usuarios asignados aún</p>
            )}
          </div>
        </div>
        </CardContent>
      </DialogContent>
    </Dialog>
  );
}
