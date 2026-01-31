/**
 * Dashboard para Regulador (solo lectura)
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assetsApi, alertsApi, trustsApi } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ProtectedRoute } from '../../components/layout/ProtectedRoute';
import { FileText, AlertCircle, TrendingUp, Eye, Download, Shield, Building2 } from 'lucide-react';

function ReguladorDashboard() {
  const { data: assetsData } = useQuery({
    queryKey: ['assets', '10045'],
    queryFn: () => assetsApi.list('10045'),
  });

  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.list(),
  });

  const { data: trustSummary } = useQuery({
    queryKey: ['trust', '10045', 'summary'],
    queryFn: () => trustsApi.getSummary('10045'),
  });

  // Extraer el array de activos del objeto de respuesta
  const assets = Array.isArray(assetsData?.assets) ? assetsData.assets : [];
  
  // Extraer el array de alertas del objeto de respuesta
  const alerts = Array.isArray(alertsData?.alerts) ? alertsData.alerts : [];
  
  // Calcular estadísticas de cumplimiento
  const compliantAssets = assets.filter((a: any) => a.compliant);
  const nonCompliantAssets = assets.filter((a: any) => !a.compliant);
  const complianceRate = assets.length > 0
    ? Math.round((compliantAssets.length / assets.length) * 100)
    : 100;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Dashboard - Regulador</h1>
        </div>
        <p className="text-muted-foreground">
          Verificación de cumplimiento regulatorio del fideicomiso (solo lectura)
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Activos</h3>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{assets.length || 0}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Tasa de Cumplimiento</h3>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{complianceRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {compliantAssets.length} de {assets?.length || 0} activos
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Incumplimientos</h3>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{nonCompliantAssets.length}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Alertas Totales</h3>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{alerts.length || 0}</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Navegación</h2>
          </div>
          <div className="space-y-3">
            <Button asChild variant="outline" className="w-full">
              <Link to="/assets">
                <Eye className="h-4 w-4 mr-2" />
                Ver Todos los Activos
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/alerts">
                <AlertCircle className="h-4 w-4 mr-2" />
                Ver Todas las Alertas
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/trusts/10045">
                <FileText className="h-4 w-4 mr-2" />
                Ver Detalles del Fideicomiso
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/trusts/10045/organization">
                <Building2 className="h-4 w-4 mr-2" />
                Ver Estructura Organizacional
              </Link>
            </Button>
            <Button variant="outline" className="w-full" disabled>
              <Download className="h-4 w-4 mr-2" />
              Exportar Reporte Regulatorio (Próximamente)
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Análisis de Cumplimiento</h2>
          </div>
          {trustSummary ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Patrimonio Total:</span>
                  <span className="font-semibold">
                    ${Number(trustSummary.totalValue || 0).toLocaleString('es-MX')} MXN
                  </span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Bonos (Límite 30%):</span>
                  <span
                    className={`font-semibold ${
                      (trustSummary.bondPercentage || 0) > 30
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {trustSummary.bondPercentage || 0}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      (trustSummary.bondPercentage || 0) > 30
                        ? 'bg-red-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((trustSummary.bondPercentage || 0), 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Otras Inversiones (Límite 70%):</span>
                  <span
                    className={`font-semibold ${
                      (trustSummary.otherPercentage || 0) > 70
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {trustSummary.otherPercentage || 0}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      (trustSummary.otherPercentage || 0) > 70
                        ? 'bg-red-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((trustSummary.otherPercentage || 0), 100)}%` }}
                  />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold mb-2">Veredicto:</p>
                <div
                  className={`p-3 rounded ${
                    nonCompliantAssets.length === 0 &&
                    (trustSummary.bondPercentage || 0) <= 30 &&
                    (trustSummary.otherPercentage || 0) <= 70
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {nonCompliantAssets.length === 0 &&
                  (trustSummary.bondPercentage || 0) <= 30 &&
                  (trustSummary.otherPercentage || 0) <= 70
                    ? '✅ Cumple con las regulaciones'
                    : '⚠️ Requiere revisión'}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Cargando análisis...</p>
          )}
        </Card>
      </div>

      {nonCompliantAssets.length > 0 && (
        <Card className="p-6 mb-8 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-semibold text-red-900">Activos con Incumplimiento</h2>
          </div>
          <div className="space-y-2">
            {nonCompliantAssets.slice(0, 5).map((asset: any) => (
              <div key={asset.id} className="flex items-center justify-between p-2 bg-white rounded">
                <div>
                  <p className="font-medium text-sm">{asset.assetType}</p>
                  <p className="text-xs text-muted-foreground">
                    ${Number(asset.valueMxn).toLocaleString('es-MX')} MXN
                  </p>
                </div>
                <Link to={`/assets/${asset.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                </Link>
              </div>
            ))}
            {nonCompliantAssets.length > 5 && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Y {nonCompliantAssets.length - 5} más...
              </p>
            )}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Todos los Activos</h2>
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
                    {asset.description && ` • ${asset.description}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Registrado: {new Date(asset.registeredAt).toLocaleDateString('es-MX')}
                    {asset.vcHash && ' • VC Anclado en blockchain'}
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
    </div>
  );
}

export function ReguladorDashboardPage() {
  return (
    <ProtectedRoute requiredRole="REGULADOR">
      <ReguladorDashboard />
    </ProtectedRoute>
  );
}
