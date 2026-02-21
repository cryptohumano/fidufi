/**
 * Página para listar y gestionar estados de cuenta mensuales
 */

import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { monthlyStatementsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { FileText, Calendar, CheckCircle2, AlertCircle, Clock, Plus, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTrustSelection } from '../contexts/TrustSelectionContext';

function MonthlyStatementsList() {
  const { trustId } = useParams<{ trustId: string }>();
  const { actor } = useAuth();
  const { selectedTrustId } = useTrustSelection();
  const trustIdToUse = trustId || selectedTrustId || '';

  const { data: statementsData, isLoading } = useQuery({
    queryKey: ['monthly-statements', trustIdToUse],
    queryFn: () => monthlyStatementsApi.list({ trustId: trustIdToUse, limit: 50 }),
    enabled: !!trustIdToUse,
  });

  const statements = statementsData?.statements || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pendiente</Badge>;
      case 'APPROVED':
        return <Badge variant="default" className="bg-green-500">Aprobado</Badge>;
      case 'OBSERVED':
        return <Badge variant="destructive">Observado</Badge>;
      case 'TACITLY_APPROVED':
        return <Badge variant="default" className="bg-blue-500">Aprobado Tácitamente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'APPROVED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'OBSERVED':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'TACITLY_APPROVED':
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getMonthName = (month: number) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1];
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Estados de Cuenta Mensuales</h1>
        <p className="text-muted-foreground">
          Gestión de estados de cuenta del fideicomiso {trustIdToUse}
        </p>
      </div>

      {/* Botón para crear estado de cuenta (solo Fiduciario) */}
      {(actor?.role === 'FIDUCIARIO' || actor?.isSuperAdmin) && (
        <div className="mb-6">
          <Button asChild>
            <Link to={`/trusts/${trustIdToUse}/statements/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Estado de Cuenta
            </Link>
          </Button>
        </div>
      )}

      {/* Lista de Estados de Cuenta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historial de Estados de Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statements.length > 0 ? (
            <div className="space-y-4">
              {statements.map((statement: any) => (
                <div
                  key={statement.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">
                          {getMonthName(statement.month)} {statement.year}
                        </h3>
                        {getStatusBadge(statement.status)}
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground ml-8">
                        <div>
                          <span className="font-medium">Período:</span>{' '}
                          {formatDate(statement.periodStart)} - {formatDate(statement.periodEnd)}
                        </div>
                        <div>
                          <span className="font-medium">Emitido:</span>{' '}
                          {formatDate(statement.statementDate)}
                        </div>
                        {statement.reviewedAt && (
                          <div>
                            <span className="font-medium">Revisado:</span>{' '}
                            {formatDate(statement.reviewedAt)}
                          </div>
                        )}
                      </div>

                      {statement.observations && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-sm font-medium text-yellow-800 mb-1">Observaciones:</p>
                          <p className="text-sm text-yellow-700">{statement.observations}</p>
                        </div>
                      )}

                      {statement.summary && (
                        <div className="mt-3 grid md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Patrimonio Total:</span>{' '}
                            <span className="font-semibold">
                              ${Number(statement.summary.totalAssets || 0).toLocaleString('es-MX')} MXN
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Activos:</span>{' '}
                            <span className="font-semibold">{statement.summary.assetsCount || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cumplientes:</span>{' '}
                            <span className="font-semibold text-green-600">
                              {statement.summary.compliantAssetsCount || 0}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusIcon(statement.status)}
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/trusts/${trustIdToUse}/statements/${statement.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay estados de cuenta registrados</p>
              {(actor?.role === 'FIDUCIARIO' || actor?.isSuperAdmin) && (
                <Button asChild className="mt-4" variant="outline">
                  <Link to={`/trusts/${trustIdToUse}/statements/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primer Estado de Cuenta
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function MonthlyStatementsPage() {
  return (
    <ProtectedRoute>
      <MonthlyStatementsList />
    </ProtectedRoute>
  );
}
