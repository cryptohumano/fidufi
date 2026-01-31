/**
 * Componente para mostrar el timeline trimestral de procesos del fiduciario
 * Muestra eventos importantes por trimestre: reuniones, estados de cuenta, pagos, etc.
 */

import { useQuery } from '@tanstack/react-query';
import { trustsApi, comiteSessionsApi, monthlyStatementsApi } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar, FileText, DollarSign, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface QuarterlyTimelineProps {
  trustId: string;
}

export function QuarterlyTimeline({ trustId }: QuarterlyTimelineProps) {
  const { data: timeline } = useQuery({
    queryKey: ['trust', trustId, 'timeline'],
    queryFn: () => trustsApi.getTimeline(trustId),
    enabled: !!trustId,
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['comite-sessions', trustId],
    queryFn: () => comiteSessionsApi.list({ trustId, limit: 20 }),
    enabled: !!trustId,
  });

  const { data: statementsData } = useQuery({
    queryKey: ['monthly-statements', trustId],
    queryFn: () => monthlyStatementsApi.list({ trustId, limit: 50 }),
    enabled: !!trustId,
  });

  // Calcular trimestres desde la constitución
  const getQuarterlyEvents = () => {
    if (!timeline?.constitutionDate) return [];

    const constitutionDate = new Date(timeline.constitutionDate);
    const now = new Date();
    const events: Array<{
      quarter: string;
      startDate: Date;
      endDate: Date;
      sessions: any[];
      statements: any[];
      status: 'past' | 'current' | 'future';
    }> = [];

    // Calcular trimestres (cada 3 meses)
    let currentDate = new Date(constitutionDate);
    let quarterNumber = 1;
    const year = constitutionDate.getFullYear();

    while (currentDate <= new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())) {
      const quarterStart = new Date(currentDate);
      const quarterEnd = new Date(currentDate);
      quarterEnd.setMonth(quarterEnd.getMonth() + 3);
      quarterEnd.setDate(quarterEnd.getDate() - 1);

      const sessions = sessionsData?.sessions?.filter((s: any) => {
        const sessionDate = new Date(s.sessionDate);
        return sessionDate >= quarterStart && sessionDate <= quarterEnd;
      }) || [];

      // Obtener estados de cuenta del trimestre (meses dentro del trimestre)
      const quarterMonths = [];
      for (let m = quarterStart.getMonth(); m <= quarterEnd.getMonth(); m++) {
        quarterMonths.push(m + 1); // Meses son 1-12
      }
      const statements = statementsData?.statements?.filter((s: any) => {
        return s.year === quarterStart.getFullYear() && quarterMonths.includes(s.month);
      }) || [];

      let status: 'past' | 'current' | 'future' = 'future';
      if (quarterEnd < now) {
        status = 'past';
      } else if (quarterStart <= now && quarterEnd >= now) {
        status = 'current';
      }

      events.push({
        quarter: `T${quarterNumber} ${year + Math.floor((quarterNumber - 1) / 4)}`,
        startDate: quarterStart,
        endDate: quarterEnd,
        sessions,
        statements,
        status,
      });

      currentDate.setMonth(currentDate.getMonth() + 3);
      quarterNumber++;
    }

    return events.slice(-8); // Mostrar últimos 8 trimestres
  };

  const quarterlyEvents = getQuarterlyEvents();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getQuarterStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return <Badge variant="default" className="bg-blue-500">Trimestre Actual</Badge>;
      case 'past':
        return <Badge variant="outline">Completado</Badge>;
      case 'future':
        return <Badge variant="outline" className="border-gray-300">Próximo</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Timeline Trimestral - Procesos del Fiduciario
        </CardTitle>
      </CardHeader>
      <CardContent>
        {quarterlyEvents.length > 0 ? (
          <div className="space-y-4">
            {quarterlyEvents.map((quarter, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg ${
                  quarter.status === 'current' ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{quarter.quarter}</h3>
                    {getQuarterStatusBadge(quarter.status)}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(quarter.startDate)} - {formatDate(quarter.endDate)}
                  </span>
                </div>

                <div className="space-y-2 ml-4">
                  {/* Reuniones del Comité Técnico */}
                  {quarter.sessions.length > 0 ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span>
                        {quarter.sessions.length} reunión(es) del Comité Técnico
                      </span>
                      {quarter.sessions.some((s: any) => s.status === 'COMPLETED') && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {quarter.sessions.some((s: any) => s.status === 'SCHEDULED' && new Date(s.sessionDate) > new Date()) && (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Sin reuniones programadas</span>
                    </div>
                  )}

                  {/* Estados de Cuenta */}
                  {quarter.statements && quarter.statements.length > 0 ? (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span>
                        {quarter.statements.length} estado(s) de cuenta
                      </span>
                      {quarter.statements.some((s: any) => s.status === 'APPROVED' || s.status === 'TACITLY_APPROVED') && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {quarter.statements.some((s: any) => s.status === 'PENDING') && (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                      {quarter.statements.some((s: any) => s.status === 'OBSERVED') && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Sin estados de cuenta registrados</span>
                    </div>
                  )}

                  {/* Pagos de Honorarios */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Honorarios mensuales del fiduciario</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay información de trimestres disponible
          </p>
        )}
      </CardContent>
    </Card>
  );
}
