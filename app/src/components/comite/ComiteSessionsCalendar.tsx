/**
 * Componente para mostrar el calendario de reuniones del Comité Técnico
 */

import { useQuery } from '@tanstack/react-query';
import { comiteSessionsApi } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, Clock, Users, FileText, Plus, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ComiteSessionsCalendarProps {
  trustId: string;
  showCreateButton?: boolean;
}

export function ComiteSessionsCalendar({ trustId, showCreateButton = false }: ComiteSessionsCalendarProps) {
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['comite-sessions', trustId],
    queryFn: () => comiteSessionsApi.list({ trustId, limit: 20 }),
    enabled: !!trustId,
  });

  const { data: nextQuarterly } = useQuery({
    queryKey: ['comite-sessions', trustId, 'next-quarterly'],
    queryFn: () => comiteSessionsApi.getNextQuarterly(trustId),
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

  const sessions = sessionsData?.sessions || [];
  const upcomingSessions = sessions.filter((s: any) => {
    const sessionDate = new Date(s.sessionDate);
    return sessionDate >= new Date() && s.status !== 'CANCELLED';
  }).slice(0, 5);

  const pastSessions = sessions.filter((s: any) => {
    const sessionDate = new Date(s.sessionDate);
    return sessionDate < new Date() || s.status === 'COMPLETED';
  }).slice(0, 5);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="outline" className="border-blue-500 text-blue-700">Programada</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-yellow-500">En Curso</Badge>;
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-500">Completada</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'QUARTERLY':
        return 'Trimestral';
      case 'EXTRAORDINARY':
        return 'Extraordinaria';
      case 'SPECIAL':
        return 'Especial';
      default:
        return type;
    }
  };

  const getDaysUntil = (date: string) => {
    const sessionDate = new Date(date);
    const now = new Date();
    const diffTime = sessionDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reuniones del Comité Técnico
          </CardTitle>
          {showCreateButton && (
            <Button asChild size="sm">
              <Link to={`/trusts/${trustId}/sessions/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Sesión
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Próxima Reunión Trimestral */}
        {nextQuarterly?.nextMeetingDate && (
          <div className="p-4 rounded-lg bg-muted border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-semibold">Próxima Reunión Trimestral</span>
            </div>
            <p className="text-lg font-bold">
              {formatDate(nextQuarterly.nextMeetingDate)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {getDaysUntil(nextQuarterly.nextMeetingDate) > 0
                ? `En ${getDaysUntil(nextQuarterly.nextMeetingDate)} días`
                : 'Hoy'}
            </p>
          </div>
        )}

        {/* Próximas Reuniones */}
        {upcomingSessions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Reuniones
            </h3>
            <div className="space-y-3">
              {upcomingSessions.map((session: any) => {
                const daysUntil = getDaysUntil(session.sessionDate);
                return (
                  <div
                    key={session.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{formatDate(session.sessionDate)}</span>
                          {getStatusBadge(session.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {getSessionTypeLabel(session.sessionType)}
                          </span>
                          {session.attendees && session.attendees.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {session.attendees.length} asistente(s)
                            </span>
                          )}
                          {session.quorum && (
                            <Badge variant="outline" className="text-xs">Quórum</Badge>
                          )}
                        </div>
                        {daysUntil >= 0 && daysUntil <= 7 && (
                          <div className="mt-2 flex items-center gap-1 text-yellow-600 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            {daysUntil === 0
                              ? 'Reunión hoy'
                              : daysUntil === 1
                              ? 'Reunión mañana'
                              : `Reunión en ${daysUntil} días`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reuniones Pasadas */}
        {pastSessions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Reuniones Recientes
            </h3>
            <div className="space-y-2">
              {pastSessions.map((session: any) => (
                <div
                  key={session.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatDate(session.sessionDate)}</span>
                        {getStatusBadge(session.status)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>{getSessionTypeLabel(session.sessionType)}</span>
                        {session.minutes && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Acta disponible
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay reuniones programadas</p>
            {showCreateButton && (
              <Button asChild className="mt-4" variant="outline">
                <Link to={`/trusts/${trustId}/sessions/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agendar Primera Reunión
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
