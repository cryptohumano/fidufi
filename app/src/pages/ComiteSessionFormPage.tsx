/**
 * Página para crear/editar sesiones del Comité Técnico
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comiteSessionsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar, ArrowLeft, Save } from 'lucide-react';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';

function ComiteSessionForm() {
  const navigate = useNavigate();
  const { trustId, sessionId } = useParams<{ trustId: string; sessionId?: string }>();
  const queryClient = useQueryClient();
  
  const isEditing = !!sessionId;

  // Obtener sesión existente si estamos editando
  const { data: existingSession } = useQuery({
    queryKey: ['comite-session', sessionId],
    queryFn: () => comiteSessionsApi.getById(sessionId!),
    enabled: isEditing && !!sessionId,
  });

  // Estado del formulario
  const [formData, setFormData] = useState({
    sessionDate: existingSession?.sessionDate 
      ? new Date(existingSession.sessionDate).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    sessionType: (existingSession?.sessionType as 'QUARTERLY' | 'EXTRAORDINARY' | 'SPECIAL') || 'QUARTERLY',
    location: existingSession?.location || '',
    meetingLink: existingSession?.meetingLink || '',
    agenda: existingSession?.agenda ? JSON.stringify(existingSession.agenda, null, 2) : '',
  });

  // Actualizar formulario cuando se carga la sesión existente
  useEffect(() => {
    if (existingSession) {
      setFormData({
        sessionDate: new Date(existingSession.sessionDate).toISOString().slice(0, 16),
        sessionType: existingSession.sessionType as 'QUARTERLY' | 'EXTRAORDINARY' | 'SPECIAL',
        location: existingSession.location || '',
        meetingLink: existingSession.meetingLink || '',
        agenda: existingSession.agenda ? JSON.stringify(existingSession.agenda, null, 2) : '',
      });
    }
  }, [existingSession]);

  // Mutación para crear sesión
  const createMutation = useMutation({
    mutationFn: (data: {
      trustId: string;
      sessionDate: string;
      sessionType: 'QUARTERLY' | 'EXTRAORDINARY' | 'SPECIAL';
      location?: string;
      meetingLink?: string;
      agenda?: any;
    }) => comiteSessionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comite-sessions', trustId] });
      navigate(`/trusts/${trustId}`);
    },
  });

  // Mutación para actualizar sesión
  const updateMutation = useMutation({
    mutationFn: (data: {
      sessionDate?: string;
      sessionType?: 'QUARTERLY' | 'EXTRAORDINARY' | 'SPECIAL';
      location?: string;
      meetingLink?: string;
      agenda?: any;
    }) => comiteSessionsApi.update(sessionId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comite-sessions', trustId] });
      queryClient.invalidateQueries({ queryKey: ['comite-session', sessionId] });
      navigate(`/trusts/${trustId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let agendaParsed = null;
    if (formData.agenda.trim()) {
      try {
        agendaParsed = JSON.parse(formData.agenda);
      } catch (error) {
        alert('El formato de la agenda no es válido JSON. Por favor, corrígelo.');
        return;
      }
    }

    const data = {
      sessionDate: new Date(formData.sessionDate).toISOString(),
      sessionType: formData.sessionType,
      location: formData.location || undefined,
      meetingLink: formData.meetingLink || undefined,
      agenda: agendaParsed,
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate({
        trustId: trustId!,
        ...data,
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/trusts/${trustId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditing ? 'Editar Sesión' : 'Nueva Sesión del Comité Técnico'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isEditing 
            ? 'Actualiza los detalles de la sesión'
            : 'Agenda una nueva sesión del Comité Técnico'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Información de la Sesión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sessionDate">Fecha y Hora de la Sesión *</Label>
              <Input
                id="sessionDate"
                type="datetime-local"
                value={formData.sessionDate}
                onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionType">Tipo de Sesión *</Label>
              <Select
                value={formData.sessionType}
                onValueChange={(value: 'QUARTERLY' | 'EXTRAORDINARY' | 'SPECIAL') =>
                  setFormData({ ...formData, sessionType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                  <SelectItem value="EXTRAORDINARY">Extraordinaria</SelectItem>
                  <SelectItem value="SPECIAL">Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                type="text"
                placeholder="Ej: Sala de juntas, Edificio Principal"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Deja vacío si es una reunión virtual
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingLink">Link de Reunión Virtual</Label>
              <Input
                id="meetingLink"
                type="url"
                placeholder="https://meet.google.com/..."
                value={formData.meetingLink}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                URL para reuniones virtuales (Zoom, Google Meet, etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agenda">Agenda (JSON)</Label>
              <Textarea
                id="agenda"
                placeholder='{"items": ["Punto 1", "Punto 2"]}'
                value={formData.agenda}
                onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Formato JSON opcional para la agenda de la sesión
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createMutation.isPending || updateMutation.isPending
                  ? 'Guardando...'
                  : isEditing
                  ? 'Actualizar Sesión'
                  : 'Crear Sesión'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/trusts/${trustId}`)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function ComiteSessionFormPage() {
  return (
    <ProtectedRoute requiredRole={['COMITE_TECNICO', 'FIDUCIARIO']}>
      <ComiteSessionForm />
    </ProtectedRoute>
  );
}
