/**
 * Página de detalles del fideicomiso
 */

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { trustsApi } from '../lib/api';
import { Card } from '../components/ui/card';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { TrustTimeline } from '../components/trust/TrustTimeline';
import { TrustParties } from '../components/trust/TrustParties';
import { FileText, TrendingUp, AlertCircle } from 'lucide-react';

function TrustDetails() {
  const { trustId } = useParams<{ trustId: string }>();

  const { data: trust, isLoading } = useQuery({
    queryKey: ['trust', trustId],
    queryFn: () => trustsApi.getById(trustId!),
    enabled: !!trustId,
  });

  const { data: summary } = useQuery({
    queryKey: ['trust', trustId, 'summary'],
    queryFn: () => trustsApi.getSummary(trustId!),
    enabled: !!trustId,
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando información del fideicomiso...</p>
      </div>
    );
  }

  if (!trust) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive">Fideicomiso no encontrado</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {trust.name || `Fideicomiso ${trust.trustId}`}
        </h1>
        <p className="text-muted-foreground">ID: {trust.trustId}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Información General</h2>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Patrimonio Inicial:</span>
              <p className="text-lg font-semibold">
                ${parseFloat(trust.initialCapital).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Estado:</span>
              <p className="font-semibold">{trust.active ? 'Activo' : 'Inactivo'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Límites de Inversión</h2>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Bonos Gubernamentales:</span>
              <p className="text-lg font-semibold">{trust.bondLimitPercent}%</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Otros Activos:</span>
              <p className="text-lg font-semibold">{trust.otherLimitPercent}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Timeline del Fideicomiso */}
      <div className="mb-8">
        <TrustTimeline trustId={trustId!} />
      </div>

      {/* Partes Involucradas */}
      <div className="mb-8">
        <TrustParties trustId={trustId!} />
      </div>

      {summary && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Resumen de Inversiones</h2>
          <div className="mb-4 p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Los cálculos de inversión solo incluyen activos que <strong>cumplen</strong> con las reglas del fideicomiso. 
              Los activos que no cumplen están registrados pero no se consideran como inversión válida.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Total de Activos Registrados</p>
              <p className="text-2xl font-bold">{summary.totalAssets || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                (Incluye activos que cumplen y no cumplen)
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Valor Total Invertido (Cumplientes)</p>
              <p className="text-2xl font-bold">
                ${parseFloat(summary.totalInvested || '0').toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Patrimonio inicial: ${parseFloat(trust.initialCapital).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                {trust.initialCapital && parseFloat(summary.totalInvested || '0') > parseFloat(trust.initialCapital) && (
                  <span className="text-yellow-600 font-medium">
                    ⚠️ La inversión excede el patrimonio inicial (posible crecimiento por rendimientos)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Inversión en Bonos (Cumplientes)</p>
              <p className="text-xl font-semibold">
                ${parseFloat(summary.bondInvestment || '0').toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-sm font-medium ${
                (summary.bondPercent || 0) > parseFloat(trust.bondLimitPercent) 
                  ? 'text-red-600' 
                  : (summary.bondPercent || 0) > 0 ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                {summary.bondPercent?.toFixed(2) || '0'}% del patrimonio | Límite: {trust.bondLimitPercent}%
                {(summary.bondPercent || 0) > parseFloat(trust.bondLimitPercent) && (
                  <span className="ml-2">⚠️ Excede límite</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Otra Inversión (Cumplientes)</p>
              <p className="text-xl font-semibold">
                ${parseFloat(summary.otherInvestment || '0').toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-sm font-medium ${
                (summary.otherPercent || 0) > parseFloat(trust.otherLimitPercent) 
                  ? 'text-red-600' 
                  : (summary.otherPercent || 0) > 0 ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                {summary.otherPercent?.toFixed(2) || '0'}% del patrimonio | Límite: {trust.otherLimitPercent}%
                {(summary.otherPercent || 0) > parseFloat(trust.otherLimitPercent) && (
                  <span className="ml-2">⚠️ Excede límite</span>
                )}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export function TrustPage() {
  return (
    <ProtectedRoute>
      <TrustDetails />
    </ProtectedRoute>
  );
}
