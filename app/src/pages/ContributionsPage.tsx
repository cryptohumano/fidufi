/**
 * Página de Aportes (Contributions) y Mora / Intimaciones
 * Iteración 2
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contributionsApi, type Contribution } from '../lib/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useTrustSelection } from '../contexts/TrustSelectionContext';
import { AlertCircle, CheckCircle, Clock, Send } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  OVERDUE: 'En mora',
  CANCELLED: 'Cancelado',
};

function ContributionsPage() {
  const { trustId: paramTrustId } = useParams<{ trustId: string }>();
  const { selectedTrustId } = useTrustSelection();
  const trustId = paramTrustId || selectedTrustId;
  const { actor } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [intimacionId, setIntimacionId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['contributions', trustId, statusFilter],
    queryFn: () =>
      contributionsApi.list(trustId!, {
        status: statusFilter || undefined,
        limit: 100,
      }),
    enabled: !!trustId,
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => contributionsApi.markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions'] });
    },
  });

  const recordIntimacionMutation = useMutation({
    mutationFn: (id: string) => contributionsApi.recordIntimacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions'] });
      setIntimacionId(null);
    },
  });

  const canEdit = actor?.role === 'FIDUCIARIO' || actor?.role === 'COMITE_TECNICO';

  if (!trustId) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <p className="text-muted-foreground">Selecciona un fideicomiso o abre la página de aportes desde un fideicomiso.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando aportes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-destructive">
          <p className="text-destructive">Error al cargar aportes.</p>
        </Card>
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const overdue = items.filter((c) => c.status === 'OVERDUE');
  const pending = items.filter((c) => c.status === 'PENDING');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Aportes</h1>
        <p className="text-muted-foreground">Listado de aportes y mora / intimaciones</p>
      </div>

      {(overdue.length > 0 || pending.length > 0) && (
        <Card className="p-4">
          <h2 className="font-medium mb-2">Resumen</h2>
          <div className="flex gap-4 flex-wrap">
            {overdue.length > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                <span>{overdue.length} en mora</span>
              </div>
            )}
            {pending.length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <span>{pending.length} pendientes</span>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium">Estado:</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="PENDING">Pendiente</option>
          <option value="OVERDUE">En mora</option>
          <option value="PAID">Pagado</option>
        </select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Intimación</TableHead>
              {canEdit && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">
                  No hay aportes para este fideicomiso.
                </TableCell>
              </TableRow>
            ) : (
              items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.concept}</TableCell>
                  <TableCell>
                    {c.amount} {c.currency}
                  </TableCell>
                  <TableCell>{new Date(c.dueDate).toLocaleDateString('es-MX')}</TableCell>
                  <TableCell>
                    <span
                      className={
                        c.status === 'OVERDUE'
                          ? 'text-amber-600'
                          : c.status === 'PAID'
                            ? 'text-green-600'
                            : ''
                      }
                    >
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {c.intimacionSentAt
                      ? new Date(c.intimacionSentAt).toLocaleDateString('es-MX')
                      : '—'}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right space-x-2">
                      {c.status !== 'PAID' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markPaidMutation.mutate(c.id)}
                            disabled={markPaidMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Marcar pagado
                          </Button>
                          {(c.status === 'OVERDUE' || c.status === 'PENDING') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIntimacionId(c.id)}
                              disabled={recordIntimacionMutation.isPending}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Registrar intimación
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!intimacionId} onOpenChange={() => setIntimacionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar intimación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se registrará el envío de la intimación por aporte en mora. Opcional: indica la URL del documento o la plantilla usada.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntimacionId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => intimacionId && recordIntimacionMutation.mutate(intimacionId)}
              disabled={recordIntimacionMutation.isPending}
            >
              Registrar envío
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContributionsPage;
