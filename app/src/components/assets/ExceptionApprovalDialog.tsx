/**
 * Componente de diálogo para aprobar o rechazar excepciones
 * Solo visible para el Comité Técnico cuando el activo está en estado PENDING_REVIEW
 */

import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { assetsApi, trustsApi, exceptionVotesApi } from '../../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { CheckCircle2, XCircle, AlertTriangle, TrendingUp, TrendingDown, Info, Users, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ExceptionApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetType: string;
  valueMxn: string;
  trustId?: string; // Opcional: se obtiene del activo si no se proporciona
  onSuccess?: () => void;
}

export function ExceptionApprovalDialog({
  open,
  onOpenChange,
  assetId,
  assetType,
  valueMxn,
  trustId: propTrustId,
  onSuccess,
}: ExceptionApprovalDialogProps) {
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const queryClient = useQueryClient();
  const { actor } = useAuth();

  const approveMutation = useMutation({
    mutationFn: (reason?: string) => {
      if (trust?.requiresConsensus) {
        // Si requiere consenso, usar el sistema de votaciones
        return exceptionVotesApi.vote({ assetId, vote: 'APPROVE', reason });
      } else {
        // Si no requiere consenso, aprobar directamente
        return assetsApi.approveException(assetId, reason);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['exception-votes', assetId] });
      refetchVotingStatus();
      if (!trust?.requiresConsensus || votingStatus?.status !== 'PENDING') {
        onOpenChange(false);
        setReason('');
        setAction(null);
        onSuccess?.();
      } else {
        setAction(null);
        setReason('');
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason?: string) => {
      if (trust?.requiresConsensus) {
        // Si requiere consenso, usar el sistema de votaciones
        return exceptionVotesApi.vote({ assetId, vote: 'REJECT', reason });
      } else {
        // Si no requiere consenso, rechazar directamente
        return assetsApi.rejectException(assetId, reason);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['exception-votes', assetId] });
      refetchVotingStatus();
      if (!trust?.requiresConsensus || votingStatus?.status !== 'PENDING') {
        onOpenChange(false);
        setReason('');
        setAction(null);
        onSuccess?.();
      } else {
        setAction(null);
        setReason('');
      }
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

  // Obtener información del activo para obtener trustId si no se proporciona
  const { data: asset } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => assetsApi.getById(assetId),
    enabled: open && !propTrustId,
  });

  const trustId = propTrustId || asset?.trustId;

  // Obtener información del fideicomiso para saber si requiere consenso
  const { data: trust } = useQuery({
    queryKey: ['trust', trustId],
    queryFn: () => trustsApi.getById(trustId!),
    enabled: open && !!trustId,
  });

  // Obtener estado de votaciones si requiere consenso
  const { data: votingStatus, refetch: refetchVotingStatus } = useQuery({
    queryKey: ['exception-votes', assetId],
    queryFn: () => exceptionVotesApi.getStatus(assetId),
    enabled: open && !!trust?.requiresConsensus,
    refetchInterval: (data) => {
      // Refrescar cada 5 segundos si aún está pendiente
      if (data?.status === 'PENDING') return 5000;
      return false;
    },
  });

  // Obtener resumen del fideicomiso para mostrar métricas
  const { data: trustSummary } = useQuery({
    queryKey: ['trust', trustId, 'summary'],
    queryFn: () => trustsApi.getSummary(trustId!),
    enabled: open && !!trustId,
  });

  const isLoading = approveMutation.isPending || rejectMutation.isPending;

  // Verificar si el usuario ya votó
  const hasUserVoted = votingStatus?.votes?.some((v: any) => v.voterId === actor?.id);
  const userVote = votingStatus?.votes?.find((v: any) => v.voterId === actor?.id);

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
              {/* Información sobre consenso */}
              {trust?.requiresConsensus ? (
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">Requiere Consenso del Comité Técnico</p>
                    <p className="text-sm text-blue-800 mt-1">
                      Este fideicomiso requiere mayoría ({votingStatus?.majority || 2} de {votingStatus?.totalMembers || 3} miembros) para aprobar excepciones.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900">Activo Pendiente de Revisión</p>
                    <p className="text-sm text-yellow-800 mt-1">
                      Este activo requiere la aprobación del Comité Técnico para ser considerado como excepción válida.
                    </p>
                  </div>
                </div>
              )}

              {/* Estado de votaciones si requiere consenso */}
              {trust?.requiresConsensus && votingStatus && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <h3 className="text-sm font-semibold text-purple-900">Estado de Votaciones</h3>
                    </div>
                    <div className="space-y-3">
                      {/* Resumen de votos */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-green-100 rounded">
                          <div className="text-lg font-bold text-green-700">{votingStatus.approveVotes || 0}</div>
                          <div className="text-xs text-green-600">A Favor</div>
                        </div>
                        <div className="text-center p-2 bg-red-100 rounded">
                          <div className="text-lg font-bold text-red-700">{votingStatus.rejectVotes || 0}</div>
                          <div className="text-xs text-red-600">En Contra</div>
                        </div>
                        <div className="text-center p-2 bg-gray-100 rounded">
                          <div className="text-lg font-bold text-gray-700">{votingStatus.pendingVotes || 0}</div>
                          <div className="text-xs text-gray-600">Pendientes</div>
                        </div>
                      </div>

                      {/* Estado actual */}
                      <div className="pt-2 border-t border-purple-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Estado:</span>
                          <span className={`text-sm font-semibold ${
                            votingStatus.status === 'APPROVED' ? 'text-green-600' :
                            votingStatus.status === 'REJECTED' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>
                            {votingStatus.status === 'APPROVED' ? '✓ Aprobado por Mayoría' :
                             votingStatus.status === 'REJECTED' ? '✗ Rechazado por Mayoría' :
                             '⏳ Pendiente de Votación'}
                          </span>
                        </div>
                        {votingStatus.status === 'PENDING' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Se necesitan {votingStatus.majority} votos para alcanzar la mayoría
                          </p>
                        )}
                      </div>

                      {/* Lista de votos */}
                      {votingStatus.votes && votingStatus.votes.length > 0 && (
                        <div className="pt-2 border-t border-purple-200">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Votos Registrados:</p>
                          <div className="space-y-1">
                            {votingStatus.votes.map((vote: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-xs p-1.5 bg-white rounded">
                                <span className="text-muted-foreground">{vote.voter?.name || 'Miembro del Comité'}</span>
                                <span className={`font-medium ${
                                  vote.vote === 'APPROVE' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {vote.vote === 'APPROVE' ? '✓ A favor' : '✗ En contra'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Indicador si el usuario ya votó */}
                      {hasUserVoted && (
                        <div className="pt-2 border-t border-purple-200">
                          <div className="flex items-center gap-2 p-2 bg-blue-100 rounded">
                            <Info className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-blue-800">
                              Ya votaste: <strong>{userVote?.vote === 'APPROVE' ? 'A favor' : 'En contra'}</strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Estado actual del fideicomiso */}
              {trustSummary && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-blue-900">Estado Actual del Fideicomiso</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Patrimonio Inicial:</span>
                        <span className="font-medium">
                          ${parseFloat(trustSummary.initialCapital.toString()).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Invertido:</span>
                        <span className="font-medium">
                          ${parseFloat(trustSummary.totalInvested.toString()).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-200">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs text-muted-foreground">Bonos:</span>
                            <span className="text-xs font-medium">
                              {trustSummary.bondPercent.toFixed(1)}% / {trustSummary.bondLimitPercent.toString()}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${parseFloat(trustSummary.bondInvestment.toString()).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs text-muted-foreground">Otros:</span>
                            <span className="text-xs font-medium">
                              {trustSummary.otherPercent.toFixed(1)}% / {trustSummary.otherLimitPercent.toString()}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${parseFloat(trustSummary.otherInvestment.toString()).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                          </div>
                        </div>
                      </div>
                      {assetType === 'GovernmentBond' && (
                        <div className="pt-2 border-t border-blue-200">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Impacto de aprobar este activo:</span>
                            <span className="text-xs font-medium text-blue-700">
                              Bonos: {(trustSummary.bondPercent + (parseFloat(valueMxn) / parseFloat(trustSummary.initialCapital.toString())) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                      {(assetType === 'MortgageLoan' || assetType === 'InsuranceReserve' || assetType === 'CNBVApproved' || assetType === 'SocialHousing') && (
                        <div className="pt-2 border-t border-blue-200">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Impacto de aprobar este activo:</span>
                            <span className="text-xs font-medium text-blue-700">
                              Otros: {(trustSummary.otherPercent + (parseFloat(valueMxn) / parseFloat(trustSummary.initialCapital.toString())) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

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
                      {trust?.requiresConsensus 
                        ? (action === 'approve' ? 'Registrando voto...' : 'Registrando voto...')
                        : (action === 'approve' ? 'Aprobando...' : 'Rechazando...')
                      }
                    </>
                  ) : (
                    <>
                      {action === 'approve' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {trust?.requiresConsensus ? 'Confirmar Voto a Favor' : 'Confirmar Aprobación'}
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          {trust?.requiresConsensus ? 'Confirmar Voto en Contra' : 'Confirmar Rechazo'}
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
