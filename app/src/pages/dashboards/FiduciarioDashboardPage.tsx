/**
 * Dashboard para Fiduciario
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assetsApi, alertsApi, trustsApi, auditLogsApi } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ProtectedRoute } from '../../components/layout/ProtectedRoute';
import { ComplianceIndicator } from '../../components/compliance/ComplianceIndicator';
import { ComplianceRateCard } from '../../components/compliance/ComplianceRateCard';
import { PatrimonyCard } from '../../components/compliance/PatrimonyCard';
import { TrustTimeline } from '../../components/trust/TrustTimeline';
import { QuarterlyTimeline } from '../../components/trust/QuarterlyTimeline';
import { ComiteSessionsCalendar } from '../../components/comite/ComiteSessionsCalendar';
import { useTrustSelection } from '../../contexts/TrustSelectionContext';
import { FileText, AlertCircle, TrendingUp, Plus, Eye, BarChart3, Users, Building2, Activity, Clock, User } from 'lucide-react';

function FiduciarioDashboard() {
  const { selectedTrustId, trusts, hasMultipleTrusts, setSelectedTrustId } = useTrustSelection();

  const { data: assetsData } = useQuery({
    queryKey: ['assets', selectedTrustId],
    queryFn: () => assetsApi.list(selectedTrustId, { limit: 5 }),
    enabled: !!selectedTrustId,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['alerts', selectedTrustId],
    queryFn: () => alertsApi.list(selectedTrustId, { acknowledged: false }),
    enabled: !!selectedTrustId,
  });

  const { data: trustSummary } = useQuery({
    queryKey: ['trust', selectedTrustId, 'summary'],
    queryFn: () => trustsApi.getSummary(selectedTrustId),
    enabled: !!selectedTrustId,
  });

  // Analytics avanzados de cumplimiento
  const { data: analytics } = useQuery({
    queryKey: ['trust', selectedTrustId, 'analytics'],
    queryFn: () => trustsApi.getAnalytics(selectedTrustId),
    enabled: !!selectedTrustId,
  });

  // Logs de auditoría recientes (propios del fiduciario y logs de activos)
  // Se actualiza automáticamente cada 30 segundos
  const { data: recentLogsData } = useQuery({
    queryKey: ['auditLogs', 'recent', 'fiduciario'],
    queryFn: () => auditLogsApi.list({ limit: 10 }),
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });

  // Extraer el array de activos del objeto de respuesta
  const assets = Array.isArray(assetsData?.assets) ? assetsData.assets : [];
  
  // Extraer el array de alertas del objeto de respuesta
  const alerts = Array.isArray(alertsData?.alerts) ? alertsData.alerts : [];
  
  // Separar alertas por severidad
  const criticalAlerts = alerts.filter((a: any) => a.severity === 'error');
  const warningAlerts = alerts.filter((a: any) => a.severity === 'warning');
  const infoAlerts = alerts.filter((a: any) => a.severity === 'info');
  
  // Extraer el array de logs del objeto de respuesta
  const recentLogs = Array.isArray(recentLogsData?.logs) ? recentLogsData.logs : [];

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
            <h1 className="text-3xl font-bold mb-2">Dashboard - Fiduciario</h1>
            <p className="text-muted-foreground">
              Gestiona el registro de activos y monitorea el cumplimiento del fideicomiso
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
            <p className="text-sm text-muted-foreground">
              <strong>Límites:</strong> {selectedTrust.bondLimitPercent}% bonos / {selectedTrust.otherLimitPercent}% otros
            </p>
          </div>
        )}
      </div>

      {/* Métricas Clave */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {analytics && (
          <>
            <ComplianceRateCard
              rate={analytics.complianceRate}
              compliantCount={analytics.totalCompliantAssets}
              nonCompliantCount={analytics.totalNonCompliantAssets}
              totalAssets={analytics.totalCompliantAssets + analytics.totalNonCompliantAssets}
            />
            
            <PatrimonyCard
              initial={Number(analytics.patrimony.initial)}
              current={Number(analytics.patrimony.current)}
              growth={analytics.patrimony.growth}
              growthAmount={Number(analytics.patrimony.growthAmount)}
            />
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Alertas</h3>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                {criticalAlerts.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-600">Críticas</span>
                    <span className="text-lg font-bold text-red-600">{criticalAlerts.length}</span>
                  </div>
                )}
                {warningAlerts.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-yellow-600">Advertencias</span>
                    <span className="text-lg font-bold text-yellow-600">{warningAlerts.length}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-xl font-bold">{alerts.length}</span>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Beneficiarios</h3>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              {analytics.beneficiaryStats ? (
                <div className="space-y-2">
                  <p className="text-2xl font-bold">{analytics.beneficiaryStats.beneficiariesWithAssets}</p>
                  <p className="text-xs text-muted-foreground">
                    {analytics.beneficiaryStats.totalBeneficiaryAssets} activos asociados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Promedio: {analytics.beneficiaryStats.averageAssetsPerBeneficiary.toFixed(1)} activos/beneficiario
                  </p>
                </div>
              ) : (
                <p className="text-2xl font-bold">0</p>
              )}
            </Card>
          </>
        )}
        
        {!analytics && (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Total Activos</h3>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{assets.length || 0}</p>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Alertas Pendientes</h3>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{alerts.length || 0}</p>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Patrimonio</h3>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">
                ${trustSummary?.totalValue ? Number(trustSummary.totalValue).toLocaleString('es-MX') : '0'} MXN
              </p>
            </Card>
          </>
        )}
      </div>

      {/* Timeline del Fideicomiso */}
      <div className="mb-8">
        <TrustTimeline trustId={selectedTrustId} />
      </div>

      {/* Timeline Trimestral */}
      <div className="mb-8">
        <QuarterlyTimeline trustId={selectedTrustId} />
      </div>

      {/* Calendario de Reuniones */}
      <div className="mb-8">
        <ComiteSessionsCalendar trustId={selectedTrustId} showCreateButton={true} />
      </div>

      {/* Indicadores de Cumplimiento */}
      {analytics && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <ComplianceIndicator
            label="Bonos Gubernamentales"
            current={Number(analytics.bondLimit.current)}
            limit={Number(analytics.bondLimit.limit)}
            availableSpace={Number(analytics.bondLimit.availableSpace)}
            status={analytics.bondLimit.status}
            currency={true}
          />
          
          <ComplianceIndicator
            label="Otros Activos"
            current={Number(analytics.otherLimit.current)}
            limit={Number(analytics.otherLimit.limit)}
            availableSpace={Number(analytics.otherLimit.availableSpace)}
            status={analytics.otherLimit.status}
            currency={true}
          />
        </div>
      )}

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
                Ver Alertas ({alerts.length > 0 && (
                  <span className="ml-1">
                    {criticalAlerts.length > 0 && <span className="text-red-600">{criticalAlerts.length}</span>}
                    {criticalAlerts.length > 0 && warningAlerts.length > 0 && ' / '}
                    {warningAlerts.length > 0 && <span className="text-yellow-600">{warningAlerts.length}</span>}
                  </span>
                )})
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to={`/trusts/${selectedTrustId}`}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Ver Analytics Completos
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/trusts/10045/organization">
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
            <Button asChild variant="outline" className="w-full">
              <Link to={`/trusts/${selectedTrustId}/statements`}>
                <FileText className="h-4 w-4 mr-2" />
                Estados de Cuenta Mensuales
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Activos Recientes</h2>
            <Link to="/assets" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          {assets && assets.length > 0 ? (
            <div className="space-y-3">
              {assets.slice(0, 5).map((asset: any) => (
                <div key={asset.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium text-sm">{asset.assetType}</p>
                    <p className="text-xs text-muted-foreground">
                      ${Number(asset.valueMxn).toLocaleString('es-MX')} MXN
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      asset.compliant
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {asset.compliant ? 'Cumple' : 'No cumple'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay activos registrados aún
            </p>
          )}
        </Card>
      </div>

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

export function FiduciarioDashboardPage() {
  return (
    <ProtectedRoute requiredRole="FIDUCIARIO">
      <FiduciarioDashboard />
    </ProtectedRoute>
  );
}
