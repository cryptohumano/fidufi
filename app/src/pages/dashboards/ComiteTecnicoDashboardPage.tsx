/**
 * Dashboard para Comité Técnico
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assetsApi, alertsApi, trustsApi, auditLogsApi } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ProtectedRoute } from '../../components/layout/ProtectedRoute';
import { FileText, AlertCircle, TrendingUp, Plus, Eye, Settings, Building2, Activity, Clock, User } from 'lucide-react';
import { ComiteSessionsCalendar } from '../../components/comite/ComiteSessionsCalendar';
import { useTrustSelection } from '../../contexts/TrustSelectionContext';

function ComiteTecnicoDashboard() {
  const { trusts, selectedTrustId, setSelectedTrustId, isLoading: isLoadingTrusts, hasMultipleTrusts } = useTrustSelection();

  const { data: assetsData } = useQuery({
    queryKey: ['assets', selectedTrustId],
    queryFn: () => assetsApi.list(selectedTrustId, { limit: 10 }),
    enabled: !!selectedTrustId,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['alerts', selectedTrustId],
    queryFn: () => alertsApi.list(selectedTrustId, { acknowledged: false, limit: 10 }),
    enabled: !!selectedTrustId,
  });

  const { data: trustSummary } = useQuery({
    queryKey: ['trust', selectedTrustId, 'summary'],
    queryFn: () => trustsApi.getSummary(selectedTrustId),
    enabled: !!selectedTrustId,
  });

  // Logs de auditoría recientes (logs de activos y propios del comité técnico)
  // Se actualiza automáticamente cada 30 segundos
  const { data: recentLogsData } = useQuery({
    queryKey: ['auditLogs', 'recent', 'comite-tecnico', selectedTrustId],
    queryFn: () => auditLogsApi.list({ trustId: selectedTrustId, limit: 10 }),
    enabled: !!selectedTrustId,
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });

  // Extraer el array de activos del objeto de respuesta
  const assets = Array.isArray(assetsData?.assets) ? assetsData.assets : [];
  
  // Extraer el array de alertas del objeto de respuesta
  const alerts = Array.isArray(alertsData?.alerts) ? alertsData.alerts : [];
  
  // Extraer el array de logs del objeto de respuesta
  const recentLogs = Array.isArray(recentLogsData?.logs) ? recentLogsData.logs : [];
  
  // Calcular estadísticas
  const compliantAssets = assets.filter((a: any) => a.compliant);
  const nonCompliantAssets = assets.filter((a: any) => !a.compliant);

  if (isLoadingTrusts) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Cargando fideicomisos...</p>
        </Card>
      </div>
    );
  }

  if (!selectedTrustId) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card className="p-8 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">No hay fideicomisos asignados</h1>
          <p className="text-muted-foreground">
            No tienes acceso a ningún fideicomiso. Contacta al administrador para que te asigne a uno.
          </p>
        </Card>
      </div>
    );
  }

  const selectedTrust = trusts.find(t => t.trustId === selectedTrustId);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard - Comité Técnico</h1>
            <p className="text-muted-foreground">
              Supervisa el cumplimiento del fideicomiso y aprueba excepciones
            </p>
          </div>
          {hasMultipleTrusts && (
            <div className="flex items-center gap-2">
              <label htmlFor="trust-select" className="text-sm font-medium">
                Fideicomiso:
              </label>
              <select
                id="trust-select"
                value={selectedTrustId}
                onChange={(e) => setSelectedTrustId(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                {trusts.map((trust) => (
                  <option key={trust.trustId} value={trust.trustId}>
                    {trust.name || trust.trustId}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {selectedTrust && (
          <div className="mb-4 p-4 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Fideicomiso:</strong> {selectedTrust.name || selectedTrust.trustId}
            </p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Activos</h3>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{assets?.length ?? 0}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Activos Cumplen</h3>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{compliantAssets.length}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Activos No Cumplen</h3>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{nonCompliantAssets.length}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Alertas Pendientes</h3>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{alerts.length || 0}</p>
        </Card>
      </div>

      {/* Calendario de Reuniones */}
      <div className="mb-8">
        <ComiteSessionsCalendar trustId={selectedTrustId} showCreateButton={true} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Acciones Rápidas</h2>
          </div>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/assets/register">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Nuevo Activo
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/assets">
                <Eye className="h-4 w-4 mr-2" />
                Ver Todos los Activos
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/alerts">
                <AlertCircle className="h-4 w-4 mr-2" />
                Revisar Alertas ({alerts.length || 0})
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to={`/trusts/${selectedTrustId}`}>
                <FileText className="h-4 w-4 mr-2" />
                Ver Detalles del Fideicomiso
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to={`/trusts/${selectedTrustId}/organization`}>
                <Building2 className="h-4 w-4 mr-2" />
                Ver Estructura Organizacional
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/audit-logs">
                <Activity className="h-4 w-4 mr-2" />
                Ver Logs de Auditoría
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Resumen del Fideicomiso</h2>
          </div>
          {trustSummary ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Patrimonio Total:</span>
                <span className="font-semibold">
                  ${Number(trustSummary.totalValue || 0).toLocaleString('es-MX')} MXN
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Inversión en Bonos:</span>
                <span className="font-semibold">
                  {trustSummary.bondPercentage || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Otras Inversiones:</span>
                <span className="font-semibold">
                  {trustSummary.otherPercentage || 0}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Cargando resumen...</p>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Activos Recientes</h2>
          <Link to="/assets" className="text-sm text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        {assets && assets.length > 0 ? (
          <div className="space-y-3">
            {assets.slice(0, 10).map((asset: any) => (
              <div key={asset.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex-1">
                  <p className="font-medium">{asset.assetType}</p>
                  <p className="text-sm text-muted-foreground">
                    ${Number(asset.valueMxn).toLocaleString('es-MX')} MXN
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      asset.compliant
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {asset.compliant ? 'Cumple' : 'No cumple'}
                  </span>
                  <Link to={`/assets/${asset.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay activos registrados aún
          </p>
        )}
      </Card>

      {/* Logs de Auditoría Recientes */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actividad Reciente
          </h2>
          <Link to="/audit-logs" className="text-sm text-primary hover:underline">
            Ver todos los logs
          </Link>
        </div>
        {recentLogs && recentLogs.length > 0 ? (
          <div className="space-y-3">
            {recentLogs.slice(0, 10).map((log: any) => {
              const getActionLabel = (action: string) => {
                const labels: Record<string, string> = {
                  LOGIN: 'Inicio de sesión',
                  LOGOUT: 'Cierre de sesión',
                  LOGIN_FAILED: 'Intento de login fallido',
                  ASSET_REGISTERED: 'Activo registrado',
                  ASSET_UPDATED: 'Activo actualizado',
                  EXCEPTION_APPROVED: 'Excepción aprobada',
                  EXCEPTION_REJECTED: 'Excepción rechazada',
                  TRUST_CREATED: 'Fideicomiso creado',
                  USER_CREATED: 'Usuario creado',
                  USER_UPDATED: 'Usuario actualizado',
                  ACTOR_ASSIGNED_TO_TRUST: 'Usuario asignado al fideicomiso',
                  ACTOR_REMOVED_FROM_TRUST: 'Usuario removido del fideicomiso',
                };
                return labels[action] || action;
              };

              const getActionColor = (action: string) => {
                if (action === 'LOGIN' || action === 'ASSET_REGISTERED' || action === 'EXCEPTION_APPROVED') {
                  return 'bg-green-100 text-green-800';
                }
                if (action === 'LOGIN_FAILED' || action === 'EXCEPTION_REJECTED') {
                  return 'bg-red-100 text-red-800';
                }
                return 'bg-blue-100 text-blue-800';
              };

              return (
                <div key={log.id} className="flex items-start justify-between p-3 border rounded-md hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{getActionLabel(log.action)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{log.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {log.actor && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.actor.name || log.actor.email}
                        </span>
                      )}
                      <span>
                        {new Date(log.createdAt).toLocaleString('es-MX', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {log.trustId && (
                        <span className="text-xs">
                          Fideicomiso: {log.trustId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay actividad reciente registrada
          </p>
        )}
      </Card>
    </div>
  );
}

export function ComiteTecnicoDashboardPage() {
  return (
    <ProtectedRoute requiredRole="COMITE_TECNICO">
      <ComiteTecnicoDashboard />
    </ProtectedRoute>
  );
}
