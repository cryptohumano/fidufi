/**
 * Página para listar alertas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../lib/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle2, XCircle, Info } from 'lucide-react';

function AlertsList() {
  const { actor } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['alerts', actor?.id],
    queryFn: () => alertsApi.list(actor?.id),
    enabled: !!actor?.id,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => alertsApi.acknowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando alertas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive">Error al cargar alertas</p>
      </div>
    );
  }

  const alerts = data?.alerts || [];
  const unacknowledged = alerts.filter((a: any) => !a.acknowledged);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Alertas</h1>
        <p className="text-muted-foreground">
          {unacknowledged.length > 0
            ? `${unacknowledged.length} alerta(s) sin leer de ${alerts.length} total`
            : `Todas las alertas leídas (${alerts.length} total)`}
        </p>
      </div>

      {alerts.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No hay alertas</h2>
          <p className="text-muted-foreground">
            No tienes alertas pendientes en este momento.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert: any) => (
            <Card
              key={alert.id}
              className={`p-6 ${!alert.acknowledged ? 'border-l-4 border-l-yellow-600' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">
                        {alert.severity === 'error' && 'Error'}
                        {alert.severity === 'warning' && 'Advertencia'}
                        {alert.severity === 'info' && 'Información'}
                      </h3>
                      {alert.acknowledged && (
                        <span className="text-xs text-muted-foreground">(Leída)</span>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-2">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
                {!alert.acknowledged && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acknowledgeMutation.mutate(alert.id)}
                    disabled={acknowledgeMutation.isPending}
                  >
                    Marcar como leída
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function AlertsPage() {
  return (
    <ProtectedRoute>
      <AlertsList />
    </ProtectedRoute>
  );
}
