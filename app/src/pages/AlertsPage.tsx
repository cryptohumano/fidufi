/**
 * Página para listar alertas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { alertsApi } from '../lib/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { useTrustSelection } from '../contexts/TrustSelectionContext';
import { processAlertMessage } from '../utils/alertUtils';
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Calendar, 
  DollarSign, 
  Shield, 
  Users, 
  FileText 
} from 'lucide-react';

const ALERT_TYPES = [
  { value: 'EXPIRATION', label: 'Vencimiento' },
  { value: 'PAYMENT', label: 'Pago' },
  { value: 'COMPLIANCE', label: 'Cumplimiento' },
  { value: 'MEETING', label: 'Reunión' },
  { value: 'DOCUMENT', label: 'Documento' },
];

function AlertsList() {
  const { actor } = useAuth();
  const { selectedTrustId } = useTrustSelection();
  const queryClient = useQueryClient();
  const [selectedAlertType, setSelectedAlertType] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [showAcknowledged, setShowAcknowledged] = useState<boolean | undefined>(undefined);

  const { data, isLoading, error } = useQuery({
    queryKey: ['alerts', selectedTrustId],
    queryFn: () => alertsApi.list(selectedTrustId),
    enabled: !!selectedTrustId,
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

  let alerts = data?.alerts || [];
  
  // Aplicar filtros
  if (selectedAlertType) {
    alerts = alerts.filter((a: any) => a.alertType === selectedAlertType);
  }
  if (selectedSeverity) {
    alerts = alerts.filter((a: any) => a.severity === selectedSeverity);
  }
  if (showAcknowledged !== undefined) {
    alerts = alerts.filter((a: any) => a.acknowledged === showAcknowledged);
  }
  
  const unacknowledged = alerts.filter((a: any) => !a.acknowledged);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getAlertTypeIcon = (alertType?: string) => {
    switch (alertType) {
      case 'EXPIRATION':
        return <Calendar className="h-4 w-4" />;
      case 'PAYMENT':
        return <DollarSign className="h-4 w-4" />;
      case 'COMPLIANCE':
        return <Shield className="h-4 w-4" />;
      case 'MEETING':
        return <Users className="h-4 w-4" />;
      case 'DOCUMENT':
        return <FileText className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getAlertTypeLabel = (alertType?: string) => {
    const type = ALERT_TYPES.find(t => t.value === alertType);
    return type?.label || alertType || 'General';
  };

  const clearFilters = () => {
    setSelectedAlertType('');
    setSelectedSeverity('');
    setShowAcknowledged(undefined);
  };

  const hasActiveFilters = selectedAlertType || selectedSeverity || showAcknowledged !== undefined;

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
          {alerts.map((alert: any) => {
            const borderColor = !alert.acknowledged
              ? alert.severity === 'critical'
                ? 'border-l-red-600'
                : alert.severity === 'error'
                ? 'border-l-destructive'
                : alert.severity === 'warning'
                ? 'border-l-yellow-600'
                : 'border-l-blue-600'
              : '';

            return (
              <Card
                key={alert.id}
                className={`p-6 ${borderColor ? `border-l-4 ${borderColor}` : ''} ${alert.acknowledged ? 'opacity-75' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {alert.alertType && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs font-medium">
                            {getAlertTypeIcon(alert.alertType)}
                            {getAlertTypeLabel(alert.alertType)}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          alert.severity === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : alert.severity === 'error'
                            ? 'bg-destructive/10 text-destructive'
                            : alert.severity === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.severity === 'critical' && 'Crítica'}
                          {alert.severity === 'error' && 'Error'}
                          {alert.severity === 'warning' && 'Advertencia'}
                          {alert.severity === 'info' && 'Información'}
                        </span>
                        {alert.acknowledged && (
                          <span className="text-xs text-muted-foreground">(Leída)</span>
                        )}
                      </div>
                      <p className="text-muted-foreground mb-2">{processAlertMessage(alert, selectedTrustId)}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{new Date(alert.createdAt).toLocaleString('es-MX')}</span>
                        {alert.asset && (
                          <Link
                            to={`/assets/${alert.asset.id}`}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            Ver activo
                          </Link>
                        )}
                      </div>
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
            );
          })}
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
