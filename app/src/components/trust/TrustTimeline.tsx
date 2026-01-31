/**
 * Componente para mostrar el timeline del fideicomiso
 * Muestra plazos, fechas de constitución/vencimiento, y tiempo restante
 */

import { useQuery } from '@tanstack/react-query';
import { trustsApi } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface TrustTimelineProps {
  trustId: string;
}

export function TrustTimeline({ trustId }: TrustTimelineProps) {
  const { data: timeline, isLoading } = useQuery({
    queryKey: ['trust', trustId, 'timeline'],
    queryFn: () => trustsApi.getTimeline(trustId),
    enabled: !!trustId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timeline) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No hay información de timeline disponible</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'No especificada';
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = () => {
    switch (timeline.status) {
      case 'CRITICAL':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'WARNING':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Advertencia</Badge>;
      case 'HEALTHY':
        return <Badge variant="default" className="bg-green-500">Saludable</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    switch (timeline.status) {
      case 'CRITICAL':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'HEALTHY':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTermTypeLabel = (type: string | null) => {
    switch (type) {
      case 'STANDARD':
        return 'Estándar (30 años)';
      case 'FOREIGN':
        return 'Extranjero (50 años)';
      case 'DISABILITY':
        return 'Incapacidad (70 años)';
      default:
        return 'No especificado';
    }
  };

  const formatRemainingTime = () => {
    if (timeline.remainingTermDays === null) return 'No disponible';
    
    const days = timeline.remainingTermDays;
    if (days < 0) {
      return `Expirado hace ${Math.abs(days)} días`;
    }
    
    if (timeline.remainingTermYears !== null && timeline.remainingTermYears > 0) {
      const years = timeline.remainingTermYears;
      const months = timeline.remainingTermMonths ? timeline.remainingTermMonths % 12 : 0;
      if (months > 0) {
        return `${years} año${years > 1 ? 's' : ''} y ${months} mes${months > 1 ? 'es' : ''}`;
      }
      return `${years} año${years > 1 ? 's' : ''}`;
    }
    
    if (timeline.remainingTermMonths !== null && timeline.remainingTermMonths > 0) {
      return `${timeline.remainingTermMonths} mes${timeline.remainingTermMonths > 1 ? 'es' : ''}`;
    }
    
    return `${days} día${days !== 1 ? 's' : ''}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline del Fideicomiso
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estado General */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
          {getStatusIcon()}
          <div className="flex-1">
            <p className="font-semibold">Tiempo Restante</p>
            <p className="text-2xl font-bold">{formatRemainingTime()}</p>
            {timeline.isExpiringVerySoon && (
              <p className="text-sm text-red-600 mt-1">
                ⚠️ El fideicomiso expira pronto. Se requiere acción inmediata.
              </p>
            )}
            {timeline.isExpiringSoon && !timeline.isExpiringVerySoon && (
              <p className="text-sm text-yellow-600 mt-1">
                ⚠️ El fideicomiso expira en menos de un año.
              </p>
            )}
          </div>
        </div>

        {/* Información de Plazos */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Fecha de Constitución</label>
            <p className="text-lg font-semibold">
              {timeline.constitutionDate ? formatDate(timeline.constitutionDate) : 'No especificada'}
            </p>
            {timeline.currentTermYears !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                Transcurridos: {timeline.currentTermYears} año{timeline.currentTermYears !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Fecha de Vencimiento</label>
            <p className="text-lg font-semibold">
              {timeline.expirationDate ? formatDate(timeline.expirationDate) : 'No especificada'}
            </p>
            {timeline.remainingTermYears !== null && timeline.remainingTermYears >= 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Restantes: {formatRemainingTime()}
              </p>
            )}
          </div>
        </div>

        {/* Información de Plazo Máximo */}
        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Plazo Máximo</label>
            <p className="text-lg font-semibold">
              {timeline.maxTermYears ? `${timeline.maxTermYears} años` : 'No especificado'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Tipo de Plazo</label>
            <p className="text-lg font-semibold">
              {getTermTypeLabel(timeline.termType)}
            </p>
          </div>
        </div>

        {/* Barra de Progreso Visual */}
        {timeline.constitutionDate && timeline.expirationDate && timeline.maxTermYears && (
          <div className="pt-4 border-t">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Progreso del Plazo
            </label>
            <div className="w-full bg-muted rounded-full h-4 relative overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  timeline.status === 'CRITICAL'
                    ? 'bg-red-500'
                    : timeline.status === 'WARNING'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{
                  width: timeline.currentTermYears && timeline.maxTermYears
                    ? `${Math.min((timeline.currentTermYears / timeline.maxTermYears) * 100, 100)}%`
                    : '0%',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0 años</span>
              <span>{timeline.maxTermYears} años</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
