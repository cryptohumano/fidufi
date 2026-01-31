import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { auditLogsApi, trustsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { 
  Clock, 
  User, 
  FileText, 
  Filter, 
  X,
  Activity,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  MapPin,
  Monitor,
} from 'lucide-react';

// Tipos de acciones con sus iconos y colores
const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  ASSET_REGISTERED: { label: 'Activo Registrado', icon: FileText, color: 'bg-blue-500' },
  EXCEPTION_APPROVED: { label: 'Excepción Aprobada', icon: CheckCircle, color: 'bg-green-500' },
  EXCEPTION_REJECTED: { label: 'Excepción Rechazada', icon: XCircle, color: 'bg-red-500' },
  USER_CREATED: { label: 'Usuario Creado', icon: User, color: 'bg-purple-500' },
  USER_UPDATED: { label: 'Usuario Actualizado', icon: User, color: 'bg-yellow-500' },
  USER_DELETED: { label: 'Usuario Eliminado', icon: User, color: 'bg-red-500' },
  USER_ROLE_CHANGED: { label: 'Rol Cambiado', icon: Shield, color: 'bg-orange-500' },
  LOGIN: { label: 'Inicio de Sesión', icon: CheckCircle, color: 'bg-green-500' },
  LOGIN_FAILED: { label: 'Intento de Login Fallido', icon: XCircle, color: 'bg-red-500' },
  LOGOUT: { label: 'Cierre de Sesión', icon: XCircle, color: 'bg-gray-500' },
  TRUST_CREATED: { label: 'Fideicomiso Creado', icon: FileText, color: 'bg-blue-500' },
  RULE_MODIFIED: { label: 'Regla Modificada', icon: AlertCircle, color: 'bg-yellow-500' },
  ALERT_ACKNOWLEDGED: { label: 'Alerta Reconocida', icon: Info, color: 'bg-blue-500' },
  FEE_PAID: { label: 'Honorario Pagado', icon: CheckCircle, color: 'bg-green-500' },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  Asset: 'Activo',
  Actor: 'Usuario',
  Trust: 'Fideicomiso',
  Alert: 'Alerta',
  RuleModification: 'Modificación de Regla',
  FiduciarioFee: 'Honorario',
  ActorTrust: 'Asignación',
};

export function AuditLogsPage() {
  const { actor } = useAuth();
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [selectedTrustId, setSelectedTrustId] = useState<string>('');
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const limit = 20;

  // Construir filtros
  const filters: any = {
    limit,
    offset: page * limit,
  };

  if (selectedAction) filters.action = selectedAction;
  if (selectedEntityType) filters.entityType = selectedEntityType;
  if (selectedTrustId) filters.trustId = selectedTrustId;

  // Nota: El backend maneja automáticamente los permisos según el rol del usuario
  // COMITE_TECNICO y FIDUCIARIO verán todos los logs de activos + sus propios logs
  // cuando no se especifica entityType

  // Obtener lista de fideicomisos para el dropdown
  const { data: trustsData } = useQuery({
    queryKey: ['trusts'],
    queryFn: () => trustsApi.list(),
    enabled: !!actor,
  });

  const trusts = trustsData || [];

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: () => auditLogsApi.list(filters),
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });

  const hasActiveFilters = selectedAction || selectedEntityType || selectedTrustId;

  const clearFilters = () => {
    setSelectedAction('');
    setSelectedEntityType('');
    setSelectedTrustId('');
    setPage(0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action] || { label: action, icon: Activity, color: 'bg-gray-500' };
  };

  if (isLoading) {
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

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-red-500">Error al cargar los logs: {error.message}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs de Auditoría</h1>
          <p className="text-muted-foreground mt-2">
            Registro de todas las acciones críticas realizadas en el sistema
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Limpiar filtros
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Acción</label>
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setPage(0);
                }}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todas las acciones</option>
                {Object.keys(ACTION_CONFIG).map((action) => (
                  <option key={action} value={action}>
                    {ACTION_CONFIG[action].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Entidad</label>
              <select
                value={selectedEntityType}
                onChange={(e) => {
                  setSelectedEntityType(e.target.value);
                  setPage(0);
                }}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todas las entidades</option>
                {Object.keys(ENTITY_TYPE_LABELS).map((type) => (
                  <option key={type} value={type}>
                    {ENTITY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Fideicomiso</label>
              <select
                value={selectedTrustId}
                onChange={(e) => {
                  setSelectedTrustId(e.target.value);
                  setPage(0);
                }}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos los fideicomisos</option>
                {trusts.map((trust: any) => (
                  <option key={trust.trustId} value={trust.trustId}>
                    {trust.trustId} - {trust.name || 'Sin nombre'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de logs */}
      <Card>
        <CardHeader>
          <CardTitle>
            Registros ({total} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron logs con los filtros seleccionados
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log: any) => {
                const actionConfig = getActionConfig(log.action);
                const ActionIcon = actionConfig.icon;

                return (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded ${actionConfig.color} text-white`}>
                            <ActionIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{actionConfig.label}</span>
                              {log.entityType && (
                                <Badge variant="outline">
                                  {ENTITY_TYPE_LABELS[log.entityType] || log.entityType}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {log.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>
                              {log.actor?.name || log.actor?.email || 'Sistema'}
                            </span>
                            {log.actor?.role && (
                              <Badge variant="secondary" className="ml-2">
                                {log.actor.role}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(log.createdAt)}</span>
                          </div>
                          {log.trustId && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>Fideicomiso: {log.trustId}</span>
                            </div>
                          )}
                          {log.entityId && (
                            <div className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              <span className="font-mono text-xs">
                                {log.entityId.substring(0, 8)}...
                              </span>
                            </div>
                          )}
                        </div>

                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Ver detalles adicionales
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalles del log */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClose={() => setSelectedLog(null)} />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && (
                <>
                  <div className={`p-2 rounded ${getActionConfig(selectedLog.action).color} text-white`}>
                    {(() => {
                      const Icon = getActionConfig(selectedLog.action).icon;
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </div>
                  <span>{getActionConfig(selectedLog.action).label}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              {/* Información básica */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Información General
                  </h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Descripción:</span>
                      <span className="text-sm font-medium">{selectedLog.description}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Fecha y Hora:</span>
                      <span className="text-sm font-medium">{formatDate(selectedLog.createdAt)}</span>
                    </div>
                    {selectedLog.entityType && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Tipo de Entidad:</span>
                        <Badge variant="outline">
                          {ENTITY_TYPE_LABELS[selectedLog.entityType] || selectedLog.entityType}
                        </Badge>
                      </div>
                    )}
                    {selectedLog.action && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Acción:</span>
                        <Badge variant="secondary">{selectedLog.action}</Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actor */}
                {selectedLog.actor && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Usuario
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Nombre:</span>
                        <span className="text-sm font-medium">
                          {selectedLog.actor.name || 'Sin nombre'}
                        </span>
                      </div>
                      {selectedLog.actor.email && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Email:</span>
                          <span className="text-sm font-medium">{selectedLog.actor.email}</span>
                        </div>
                      )}
                      {selectedLog.actor.role && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Rol:</span>
                          <Badge variant="secondary">{selectedLog.actor.role}</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Entidad relacionada */}
                {(selectedLog.entityId || selectedLog.trustId) && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Entidad Relacionada
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      {selectedLog.entityId && (
                        <div>
                          <span className="text-sm text-muted-foreground">ID de Entidad:</span>
                          <div className="mt-1 font-mono text-xs bg-background p-2 rounded border">
                            {selectedLog.entityId}
                          </div>
                        </div>
                      )}
                      {selectedLog.trustId && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Fideicomiso:</span>
                          <span className="text-sm font-medium">{selectedLog.trustId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Información de la solicitud */}
                {(selectedLog.ipAddress || selectedLog.userAgent || selectedLog.metadata?.location) && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Información de la Solicitud
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      {selectedLog.ipAddress && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Dirección IP:</span>
                          <span className="text-sm font-mono">{selectedLog.ipAddress}</span>
                        </div>
                      )}
                      {selectedLog.userAgent && (
                        <div>
                          <span className="text-sm text-muted-foreground">User Agent:</span>
                          <div className="mt-1 text-xs bg-background p-2 rounded border break-all">
                            {selectedLog.userAgent}
                          </div>
                        </div>
                      )}
                      {selectedLog.metadata?.location && (
                        <div>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Ubicación GPS:
                          </span>
                          <div className="mt-1 text-xs bg-background p-2 rounded border">
                            {selectedLog.metadata.location.latitude && selectedLog.metadata.location.longitude ? (
                              <>
                                Lat: {selectedLog.metadata.location.latitude.toFixed(6)}, 
                                Lng: {selectedLog.metadata.location.longitude.toFixed(6)}
                                {selectedLog.metadata.location.accuracy && (
                                  <> (Precisión: {selectedLog.metadata.location.accuracy.toFixed(0)}m)</>
                                )}
                              </>
                            ) : (
                              'No disponible'
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Metadatos Adicionales
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
