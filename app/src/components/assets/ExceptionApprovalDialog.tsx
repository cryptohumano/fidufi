/**
 * Componente de diálogo para aprobar o rechazar excepciones
 * Solo visible para el Comité Técnico cuando el activo está en estado PENDING_REVIEW
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi } from '../../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface ExceptionApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetType: string;
  valueMxn: string;
  onSuccess?: () => void;
}

export function ExceptionApprovalDialog({
  open,
  onOpenChange,
  assetId,
  assetType,
  valueMxn,
  onSuccess,
}: ExceptionApprovalDialogProps) {
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (reason?: string) => assetsApi.approveException(assetId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      onOpenChange(false);
      setReason('');
      setAction(null);
      onSuccess?.();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason?: string) => assetsApi.rejectException(assetId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      onOpenChange(false);
      setReason('');
      setAction(null);
      onSuccess?.();
    },
  });

  const handleApprove = () => {
    if (action === 'approve') {
      approveMutation.mutate(reason || undefined);
    } else {
      setAction('approve');
    }
  };

  const handleReject = () => {
    if (action === 'reject') {
      rejectMutation.mutate(reason || undefined);
    } else {
      setAction('reject');
    }
  };

  const handleCancel = () => {
    setAction(null);
    setReason('');
  };

  const isLoading = approveMutation.isPending || rejectMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>
            {action === null ? 'Revisar Excepción' : action === 'approve' ? 'Aprobar Excepción' : 'Rechazar Excepción'}
          </DialogTitle>
        </DialogHeader>
        <CardContent className="space-y-4">
          {/* Información del activo */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Tipo de Activo</p>
            <p className="font-semibold">{assetType}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Valor</p>
            <p className="font-semibold">
              ${parseFloat(valueMxn).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </p>
          </div>

          {action === null ? (
            <>
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900">Activo Pendiente de Revisión</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    Este activo requiere la aprobación del Comité Técnico para ser considerado como excepción válida.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleApprove}
                  disabled={isLoading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aprobar Excepción
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={isLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="reason" className="text-sm font-medium">
                  {action === 'approve' ? 'Razón de la Aprobación' : 'Razón del Rechazo'} (Opcional)
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    action === 'approve'
                      ? 'Explica por qué se aprueba esta excepción...'
                      : 'Explica por qué se rechaza esta excepción...'
                  }
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant={action === 'approve' ? 'default' : 'destructive'}
                  className="flex-1"
                  onClick={action === 'approve' ? handleApprove : handleReject}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {action === 'approve' ? 'Aprobando...' : 'Rechazando...'}
                    </>
                  ) : (
                    <>
                      {action === 'approve' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Confirmar Aprobación
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Confirmar Rechazo
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </DialogContent>
    </Dialog>
  );
}
