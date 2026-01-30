/**
 * Dashboard para Fiduciario
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assetsApi, alertsApi, trustsApi } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ProtectedRoute } from '../../components/layout/ProtectedRoute';
import { FileText, AlertCircle, TrendingUp, Plus, Eye } from 'lucide-react';

function FiduciarioDashboard() {
  const { data: assetsData } = useQuery({
    queryKey: ['assets', '10045'],
    queryFn: () => assetsApi.list('10045', { limit: 5 }),
  });

  const { data: alertsData } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.list(undefined, { acknowledged: false, limit: 5 }),
  });

  const { data: trustSummary } = useQuery({
    queryKey: ['trust', '10045', 'summary'],
    queryFn: () => trustsApi.getSummary('10045'),
  });

  // Extraer el array de activos del objeto de respuesta
  const assets = Array.isArray(assetsData?.assets) ? assetsData.assets : [];
  
  // Extraer el array de alertas del objeto de respuesta
  const alerts = Array.isArray(alertsData?.alerts) ? alertsData.alerts : [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard - Fiduciario</h1>
        <p className="text-muted-foreground">
          Gestiona el registro de activos y monitorea el cumplimiento del fideicomiso
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
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
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
                Ver Alertas
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
