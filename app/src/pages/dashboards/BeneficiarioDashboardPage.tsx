/**
 * Dashboard para Beneficiario (Fideicomisario)
 * Solo muestra información relevante: alertas y activos asociados
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { alertsApi, trustsApi, assetsApi } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ProtectedRoute } from '../../components/layout/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, FileText, Info, Eye } from 'lucide-react';

function BeneficiarioDashboard() {
  const { actor } = useAuth();

  // Obtener solo las alertas del beneficiario
  const { data: alertsData } = useQuery({
    queryKey: ['alerts', actor?.id],
    queryFn: () => alertsApi.list(actor?.id, { acknowledged: false }),
    enabled: !!actor?.id,
  });

  // Obtener solo los activos asociados a este beneficiario
  // El backend filtra automáticamente basado en el rol del usuario autenticado
  const { data: assetsData } = useQuery({
    queryKey: ['assets', '10045', actor?.id, actor?.role],
    queryFn: () => assetsApi.list('10045'),
    enabled: !!actor?.id,
  });

  // Extraer el array de alertas
  const alerts = Array.isArray(alertsData?.alerts) ? alertsData.alerts : [];
  
  // Extraer el array de activos asociados
  const assets = Array.isArray(assetsData?.assets) ? assetsData.assets : [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mi Panel - Beneficiario</h1>
        <p className="text-muted-foreground">
          Consulta información sobre activos del fideicomiso y alertas relacionadas contigo
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Alertas Pendientes</h3>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{alerts.length || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Activos que requieren atención
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Mis Activos</h3>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{assets.length || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Activos registrados para ti
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Fideicomiso</h3>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold">10045</p>
          <p className="text-xs text-muted-foreground mt-1">
            Fideicomiso de Pensiones
          </p>
        </Card>
      </div>

      {/* Alertas */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Mis Alertas</h2>
          <Link to="/alerts" className="text-sm text-primary hover:underline">
            Ver todas
          </Link>
        </div>
        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert: any) => (
              <div key={alert.id} className="p-4 border rounded-md">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium mb-1">{alert.message}</p>
                    {alert.asset && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p>Activo: {alert.asset.assetType}</p>
                        <p>Valor: ${Number(alert.asset.valueMxn).toLocaleString('es-MX')} MXN</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(alert.createdAt).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      alert.severity === 'error'
                        ? 'bg-red-100 text-red-800'
                        : alert.severity === 'warning'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {alert.severity === 'error' ? 'Error' : alert.severity === 'warning' ? 'Advertencia' : 'Info'}
                  </span>
                </div>
                {alert.asset && (
                  <div className="mt-3">
                    <Link to={`/assets/${alert.asset.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalles del Activo
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tienes alertas pendientes</p>
            <p className="text-sm text-muted-foreground mt-2">
              Las alertas aparecerán aquí cuando se registren activos que no cumplan con las reglas del fideicomiso
            </p>
          </div>
        )}
      </Card>

      {/* Mis Activos */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Mis Activos Asociados</h2>
        </div>
        {assets.length > 0 ? (
          <div className="space-y-3">
            {assets.map((asset: any) => {
              const assetAlerts = alerts.filter((a: any) => a.assetId === asset.id);
              return (
                <div key={asset.id} className="p-4 border rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">
                        {asset.assetType === 'MortgageLoan' && 'Préstamo Hipotecario'}
                        {asset.assetType === 'SocialHousing' && 'Vivienda Social'}
                        {asset.assetType === 'GovernmentBond' && 'Bono Gubernamental'}
                        {asset.assetType === 'InsuranceReserve' && 'Reserva de Seguros'}
                        {asset.assetType === 'CNBVApproved' && 'Valor CNBV'}
                      </p>
                      {asset.description && (
                        <p className="text-sm text-muted-foreground mt-1">{asset.description}</p>
                      )}
                      <div className="mt-2 flex gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Valor: ${Number(asset.valueMxn).toLocaleString('es-MX')} MXN
                        </span>
                        {assetAlerts.length > 0 && (
                          <span className="text-yellow-600 font-medium">
                            {assetAlerts.length} alerta{assetAlerts.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Registrado: {new Date(asset.registeredAt).toLocaleDateString('es-MX')}
                        {asset.actor && (
                          <> por {asset.actor.name || 'Fiduciario'}</>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
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
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalles
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tienes activos asociados</p>
            <p className="text-sm text-muted-foreground mt-2">
              Los activos aparecerán aquí cuando el fiduciario registre activos asociados a tu cuenta
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

export function BeneficiarioDashboardPage() {
  return (
    <ProtectedRoute requiredRole="BENEFICIARIO">
      <BeneficiarioDashboard />
    </ProtectedRoute>
  );
}
