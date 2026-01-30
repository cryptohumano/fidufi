/**
 * Dashboard para Comité Técnico
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assetsApi, alertsApi, trustsApi } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ProtectedRoute } from '../../components/layout/ProtectedRoute';
import { FileText, AlertCircle, TrendingUp, Plus, Eye, Settings } from 'lucide-react';

function ComiteTecnicoDashboard() {
  const { data: assetsData } = useQuery({
    queryKey: ['assets', '10045'],
    queryFn: () => assetsApi.list('10045', { limit: 10 }),
  });

  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.list(undefined, { acknowledged: false, limit: 10 }),
  });

  const { data: trustSummary } = useQuery({
    queryKey: ['trust', '10045', 'summary'],
    queryFn: () => trustsApi.getSummary('10045'),
  });

  // Extraer el array de activos del objeto de respuesta
  const assets = Array.isArray(assetsData?.assets) ? assetsData.assets : [];
  
  // Extraer el array de alertas del objeto de respuesta
  const alerts = Array.isArray(alertsData?.alerts) ? alertsData.alerts : [];
  
  // Calcular estadísticas
  const compliantAssets = assets.filter((a: any) => a.compliant);
  const nonCompliantAssets = assets.filter((a: any) => !a.compliant);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard - Comité Técnico</h1>
        <p className="text-muted-foreground">
          Supervisa el cumplimiento del fideicomiso y aprueba excepciones
        </p>
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
              <Link to="/trusts/10045">
                <FileText className="h-4 w-4 mr-2" />
                Ver Detalles del Fideicomiso
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
