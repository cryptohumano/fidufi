import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, FormEvent } from 'react';
import { trustsApi, adminApi, actorTrustApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Users, Building2, X, Check, AlertCircle, MoreVertical, Power, PowerOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../components/ui/dialog';

const ROLE_LABELS: Record<string, string> = {
  FIDUCIARIO: 'Fiduciario',
  COMITE_TECNICO: 'Comité Técnico',
  AUDITOR: 'Auditor',
  REGULADOR: 'Regulador',
};

/** Etiqueta de moneda por geografía. No usar fallback a MXN para no aplastar el valor guardado. */
const CURRENCY_LABELS: Record<string, string> = {
  MXN: 'MXN',
  ARS: 'ARS',
  USD: 'USD',
  EUR: 'EUR',
};
function getCurrencyLabel(currency: string | null | undefined): string {
  if (currency == null || String(currency).trim() === '') return '—';
  return CURRENCY_LABELS[String(currency).toUpperCase()] ?? String(currency);
}

/** Formatea un monto con locale según moneda (multi-geografía). Respeta ARS/USD/EUR/MXN del trust. */
function formatAmount(value: number | string, currency: string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '—';
  const code = getCurrencyLabel(currency);
  if (code === '—') return `${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (moneda no definida)`;
  const locale = code === 'ARS' ? 'es-AR' : code === 'USD' ? 'en-US' : code === 'EUR' ? 'de-DE' : 'es-MX';
  return `${num.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${code}`;
}

export function TrustsManagementPage() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
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
      trustTypeId?: string;
      trustTypeConfig?: { presupuestoTotal?: number };
      baseCurrency?: string;
    }) => {
      console.log('📤 Enviando datos al backend:', data);
      return trustsApi.create(data);
    },
    onSuccess: async () => {
      setShowCreateDialog(false);
      // Forzar petición GET /api/trusts y actualizar caché (refetchQueries a veces no dispara la petición)
      const list = await trustsApi.list();
      queryClient.setQueryData(['trusts'], list);
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
      queryClient.invalidateQueries({ queryKey: ['trusts'] });
      queryClient.invalidateQueries({ queryKey: ['actor-trust'] });
      queryClient.invalidateQueries({ queryKey: ['trust-actors', selectedTrust] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });

  const revokeActorMutation = useMutation({
    mutationFn: ({ actorId, trustId }: { actorId: string; trustId: string }) =>
      actorTrustApi.revokeActor(actorId, trustId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trusts'] });
      queryClient.invalidateQueries({ queryKey: ['actor-trust'] });
      queryClient.invalidateQueries({ queryKey: ['trust-actors', selectedTrust] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const updateTrustStatusMutation = useMutation({
    mutationFn: ({ trustId, active, status }: { trustId: string; active?: boolean; status?: string }) =>
      trustsApi.updateStatus(trustId, { active, status }),
    onSuccess: async () => {
      const list = await trustsApi.list();
      queryClient.setQueryData(['trusts'], list);
      setShowStatusDialog(false);
      setSelectedTrust('');
    },
    onError: (error: any) => {
      alert(error?.response?.data?.error || error?.message || 'Error al actualizar');
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
        {trusts?.map((trust: any) => {
          const config = trust.trustTypeConfig && typeof trust.trustTypeConfig === 'object' ? trust.trustTypeConfig : {};
          const hasPresupuestoInConfig = config && 'presupuestoTotal' in config && Number((config as { presupuestoTotal?: number }).presupuestoTotal) > 0;
          const typeCode = trust.trustTypeRef?.code ?? (trust.trustType === 'CONDOMINIUM' ? 'CONSTRUCCION' : null) ?? (hasPresupuestoInConfig ? 'CONSTRUCCION' : null) ?? null;
          const typeLabel = trust.trustTypeRef?.name ?? (trust.trustType === 'CONDOMINIUM' ? 'Construcción' : trust.trustType === 'INVESTMENT' ? 'Financiero (Inversión)' : null) ?? (hasPresupuestoInConfig ? 'Construcción' : null) ?? 'Sin tipo';
          const currency = getCurrencyLabel(trust.baseCurrency);
          const isConstruction = typeCode === 'CONSTRUCCION';
          const isFinanciero = typeCode === 'FINANCIERO' || (!typeCode && !isConstruction);
          const presupuestoTotal = isConstruction && 'presupuestoTotal' in config ? Number((config as { presupuestoTotal?: number }).presupuestoTotal) : null;

          return (
            <Card key={trust.trustId}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {trust.trustId}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs font-normal">
                      {typeLabel}
                    </Badge>
                    {trust.active ? (
                      <Badge variant="default">Activo</Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </div>
                </div>
                {trust.name && <p className="text-sm text-muted-foreground mt-1">{trust.name}</p>}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {isConstruction && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Presupuesto total (obra): </span>
                        <span className="font-semibold">
                          {presupuestoTotal != null && !Number.isNaN(presupuestoTotal)
                            ? formatAmount(presupuestoTotal, trust.baseCurrency)
                            : `— ${currency}`}
                        </span>
                      </div>
                      {trust.status != null && trust.status !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Estado: </span>
                          <span className="font-semibold capitalize">{String(trust.status).toLowerCase()}</span>
                        </div>
                      )}
                    </>
                  )}
                  {isFinanciero && !isConstruction && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Patrimonio inicial: </span>
                        <span className="font-semibold">
                          {formatAmount(trust.initialCapital ?? 0, trust.baseCurrency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Límite bonos: </span>
                        <span className="font-semibold">{trust.bondLimitPercent ?? '—'}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Límite otros: </span>
                        <span className="font-semibold">{trust.otherLimitPercent ?? '—'}%</span>
                      </div>
                    </>
                  )}
                  {typeCode === 'ADMINISTRATIVO' && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Patrimonio inicial: </span>
                        <span className="font-semibold">
                          {formatAmount(trust.initialCapital ?? 0, trust.baseCurrency)}
                        </span>
                      </div>
                      {trust.status && (
                        <div>
                          <span className="text-muted-foreground">Estado: </span>
                          <span className="font-semibold capitalize">{String(trust.status).toLowerCase()}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="pt-1 border-t mt-1">
                    <span className="text-muted-foreground text-xs">Moneda: </span>
                    <span className="text-xs font-medium">{currency}</span>
                  </div>
                </div>
                {actor?.isSuperAdmin && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedTrust(trust.trustId);
                        setShowAssignDialog(true);
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Asignar Usuarios
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Estado / Dar de baja"
                      onClick={() => {
                        setSelectedTrust(trust.trustId);
                        setShowStatusDialog(true);
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
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
            if (!open) setSelectedTrust('');
          }}
          trustId={selectedTrust}
          users={users || []}
          onAssign={(data) => assignActorMutation.mutate(data)}
          onRevoke={(actorId) => revokeActorMutation.mutate({ actorId, trustId: selectedTrust })}
          onUpdateRole={(actorId, roleInTrust) =>
            assignActorMutation.mutate({ actorId, trustId: selectedTrust, roleInTrust })
          }
          isLoading={assignActorMutation.isPending}
          isRevoking={revokeActorMutation.isPending}
        />
      )}

      {/* Dialog Estado / Dar de baja (solo SUPER_ADMIN) */}
      {showStatusDialog && selectedTrust && (() => {
        const trust = trusts?.find((t: any) => t.trustId === selectedTrust);
        return (
          <Dialog open={showStatusDialog} onOpenChange={(open) => { setShowStatusDialog(open); if (!open) setSelectedTrust(''); }}>
            <DialogContent>
              <DialogClose onClose={() => setShowStatusDialog(false)} />
              <DialogHeader>
                <DialogTitle>Estado del fideicomiso {selectedTrust}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{trust?.name || selectedTrust}</p>
                <div>
                  <label className="text-sm font-medium block mb-2">En sistema</label>
                  <div className="flex gap-2">
                    <Button
                      variant={trust?.active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateTrustStatusMutation.mutate({ trustId: selectedTrust, active: true })}
                      disabled={updateTrustStatusMutation.isPending || trust?.active === true}
                    >
                      <Power className="h-4 w-4 mr-1" /> Activo (visible)
                    </Button>
                    <Button
                      variant={trust?.active === false ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateTrustStatusMutation.mutate({ trustId: selectedTrust, active: false })}
                      disabled={updateTrustStatusMutation.isPending || trust?.active === false}
                    >
                      <PowerOff className="h-4 w-4 mr-1" /> Dar de baja
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Dar de baja lo oculta de la lista para usuarios; no borra datos.</p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Estado del contrato</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={trust?.status ?? 'DRAFT'}
                    onChange={(e) => updateTrustStatusMutation.mutate({ trustId: selectedTrust, status: e.target.value })}
                    disabled={updateTrustStatusMutation.isPending}
                  >
                    <option value="DRAFT">Borrador</option>
                    <option value="ACTIVO">Activo</option>
                    <option value="CERRADO">Cerrado</option>
                  </select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
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
    trustTypeId: '' as string,
    presupuestoTotal: '',
    initialCapital: '',
    bondLimitPercent: '30',
    otherLimitPercent: '70',
    baseCurrency: 'ARS' as string,
    constitutionDate: '',
    maxTermYears: '30',
    termType: 'STANDARD' as 'STANDARD' | 'FOREIGN' | 'DISABILITY',
    requiresConsensus: false as boolean,
  });

  const { data: trustTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['trust-types'],
    queryFn: () => trustsApi.getTypes(),
    enabled: open,
  });

  const selectedType = trustTypes.find((t) => t.id === formData.trustTypeId);
  const isConstruction = selectedType?.code === 'CONSTRUCCION';

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0];
      setFormData((prev) => ({
        ...prev,
        name: '',
        trustTypeId: '',
        presupuestoTotal: '',
        initialCapital: '',
        bondLimitPercent: '30',
        otherLimitPercent: '70',
        baseCurrency: 'ARS',
        constitutionDate: today,
        maxTermYears: '30',
        termType: 'STANDARD',
        requiresConsensus: false,
      }));
    }
  }, [open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const rawTypeId = formData.trustTypeId && String(formData.trustTypeId).trim();
    if (!rawTypeId) {
      alert('Seleccione el tipo de fideicomiso');
      return;
    }

    if (!formData.constitutionDate) {
      alert('Por favor ingrese la fecha de constitución');
      return;
    }
    const maxTermYearsValue = parseInt(formData.maxTermYears);
    if (isNaN(maxTermYearsValue) || maxTermYearsValue < 1 || maxTermYearsValue > 99) {
      alert('El plazo máximo debe estar entre 1 y 99 años');
      return;
    }

    if (isConstruction) {
      const presupuesto = parseFloat(formData.presupuestoTotal);
      if (!formData.presupuestoTotal || isNaN(presupuesto) || presupuesto <= 0) {
        alert('Para fideicomiso de construcción ingrese el monto (presupuesto total) mayor a cero');
        return;
      }
      onCreate({
        name: formData.name || undefined,
        initialCapital: 0,
        trustTypeId: rawTypeId,
        trustTypeConfig: { presupuestoTotal: presupuesto },
        baseCurrency: (formData.baseCurrency && formData.baseCurrency.trim()) || 'ARS',
        constitutionDate: formData.constitutionDate,
        maxTermYears: maxTermYearsValue,
        termType: formData.termType,
        requiresConsensus: formData.requiresConsensus,
      });
      return;
    }

    const initialCapitalValue = parseFloat(formData.initialCapital);
    if (!formData.initialCapital || isNaN(initialCapitalValue) || initialCapitalValue <= 0) {
      alert('Por favor ingrese un patrimonio inicial válido (mayor a cero)');
      return;
    }

    onCreate({
      name: formData.name || undefined,
      initialCapital: initialCapitalValue,
      bondLimitPercent: formData.bondLimitPercent ? parseFloat(formData.bondLimitPercent) : undefined,
      otherLimitPercent: formData.otherLimitPercent ? parseFloat(formData.otherLimitPercent) : undefined,
      trustTypeId: rawTypeId,
      baseCurrency: (formData.baseCurrency && formData.baseCurrency.trim()) || 'ARS',
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
            <label className="text-sm font-medium mb-2 block">
              Tipo de fideicomiso <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.trustTypeId}
              onChange={(e) => setFormData({ ...formData, trustTypeId: e.target.value })}
              required
              className="w-full p-2 border rounded-md"
              disabled={typesLoading}
            >
              <option value="">Seleccionar tipo</option>
              {trustTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.description ? ` — ${t.description}` : ''}
                </option>
              ))}
            </select>
            {typesLoading && (
              <p className="text-xs text-muted-foreground mt-1">Cargando tipos...</p>
            )}
          </div>

          {isConstruction && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Presupuesto total (monto obra) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.presupuestoTotal}
                onChange={(e) => setFormData({ ...formData, presupuestoTotal: e.target.value })}
                className="w-full p-2 border rounded-md"
                placeholder="Ej. 5000000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Monto total de la obra/construcción según contrato
              </p>
            </div>
          )}

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
            <label className="text-sm font-medium mb-2 block">Moneda base (zona geográfica)</label>
            <select
              value={formData.baseCurrency}
              onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              <option value="ARS">ARS (Argentina)</option>
              <option value="USD">USD (Estados Unidos)</option>
              <option value="MXN">MXN (México)</option>
              <option value="EUR">EUR (Eurozona)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Moneda para reportes y montos del fideicomiso
            </p>
          </div>

          {!isConstruction && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Patrimonio inicial <span className="text-red-500">*</span>
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
            </>
          )}

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
  onRevoke,
  onUpdateRole,
  isLoading,
  isRevoking,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trustId: string;
  users: any[];
  onAssign: (data: { actorId: string; trustId: string; roleInTrust: string }) => void;
  onRevoke: (actorId: string) => void;
  onUpdateRole: (actorId: string, roleInTrust: string) => void;
  isLoading: boolean;
  isRevoking: boolean;
}) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('FIDUCIARIO');

  const { data: trustActors, isError: trustActorsError } = useQuery({
    queryKey: ['trust-actors', trustId],
    queryFn: () => actorTrustApi.getTrustActors(trustId),
    enabled: open && !!trustId,
    retry: false,
  });

  const assignedActorIds = new Set((trustActors ?? []).map((a: any) => a.actorId));
  const availableUsers = users.filter(
    (user) => user.role !== 'BENEFICIARIO' && !assignedActorIds.has(user.id)
  );

  const handleAssign = () => {
    if (!selectedUserId) return;
    onAssign({ actorId: selectedUserId, trustId, roleInTrust: selectedRole });
    setSelectedUserId('');
  };

  const handleRoleChange = (actorId: string, newRole: string) => {
    onUpdateRole(actorId, newRole);
  };

  const handleRevoke = (actorId: string) => {
    if (window.confirm('¿Revocar el acceso de este usuario al fideicomiso?')) {
      onRevoke(actorId);
    }
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

          {/* Lista de usuarios asignados: editar rol y revocar */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Usuarios Asignados</h3>
            {trustActorsError && (
              <p className="text-sm text-amber-600 dark:text-amber-500 mb-2">
                No se pudieron cargar los usuarios asignados (fideicomiso no encontrado o sin acceso).
              </p>
            )}
            {trustActors && trustActors.length > 0 ? (
              <div className="space-y-2">
                {trustActors.map((membership: any) => {
                  const user = users.find((u) => u.id === membership.actorId);
                  return (
                    <div
                      key={membership.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-md"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{user?.name || user?.email || 'Usuario'}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <select
                            value={membership.roleInTrust}
                            onChange={(e) => handleRoleChange(membership.actorId, e.target.value)}
                            disabled={isLoading}
                            className="text-sm border rounded px-2 py-1 bg-background"
                          >
                            {Object.entries(ROLE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <Badge variant={membership.active ? 'default' : 'secondary'}>
                            {membership.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRevoke(membership.actorId)}
                        disabled={isRevoking}
                      >
                        Quitar
                      </Button>
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
