/**
 * Página de detalles de un activo
 */

import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { assetsApi } from '../lib/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Calendar,
  DollarSign,
  Shield,
  ExternalLink
} from 'lucide-react';

function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetsApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando detalles del activo...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Activo no encontrado</h1>
        <p className="text-muted-foreground mb-6">
          El activo que buscas no existe o no tienes permisos para verlo.
        </p>
        <Button asChild>
          <Link to="/assets">Volver a Activos</Link>
        </Button>
      </div>
    );
  }

  const getAssetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      GovernmentBond: 'Bono Gubernamental',
      MortgageLoan: 'Préstamo Hipotecario',
      InsuranceReserve: 'Reserva de Seguros',
      CNBVApproved: 'Valor Aprobado por CNBV',
      SocialHousing: 'Vivienda Social',
    };
    return labels[type] || type;
  };

  const getComplianceStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      COMPLIANT: 'Cumple',
      NON_COMPLIANT: 'No Cumple',
      PENDING_REVIEW: 'Pendiente de Revisión',
    };
    return labels[status] || status;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Detalles del Activo</h1>
          {asset.compliant ? (
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          ) : (
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          )}
        </div>
        <p className="text-muted-foreground">
          ID: {asset.id}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Información General */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Información General
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tipo de Activo</p>
              <p className="font-semibold">{getAssetTypeLabel(asset.assetType)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Fideicomiso</p>
              <p className="font-semibold">{asset.trustId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Valor</p>
              <p className="font-semibold text-lg flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                ${parseFloat(asset.valueMxn).toLocaleString('es-MX', { 
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} MXN
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Estado de Cumplimiento</p>
              <p className={`font-semibold ${
                asset.compliant ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {getComplianceStatusLabel(asset.complianceStatus)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Fecha de Registro</p>
              <p className="font-semibold flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(asset.registeredAt).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            {asset.description && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Descripción</p>
                <p className="font-medium">{asset.description}</p>
              </div>
            )}
            {asset.beneficiary && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Beneficiario Asociado</p>
                <p className="font-semibold">
                  {asset.beneficiary.name || asset.beneficiary.email || 'Sin nombre'}
                </p>
                {asset.beneficiary.email && (
                  <p className="text-xs text-muted-foreground mt-1">{asset.beneficiary.email}</p>
                )}
              </div>
            )}
            {asset.actor && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Registrado por</p>
                <p className="font-semibold">
                  {asset.actor.name || 'Sin nombre'} ({asset.actor.role})
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Evidencia Blockchain */}
        {(asset.vcHash || asset.blockchainTxHash) && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Evidencia Blockchain
            </h2>
            <div className="space-y-3">
              {asset.vcHash && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Hash del Verifiable Credential</p>
                  <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                    {asset.vcHash}
                  </p>
                </div>
              )}
              {asset.blockchainTxHash && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Hash de Transacción</p>
                  <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                    {asset.blockchainTxHash}
                  </p>
                </div>
              )}
              {asset.blockchainNetwork && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Red Blockchain</p>
                  <p className="font-semibold">{asset.blockchainNetwork}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Resultados de Validación */}
        {asset.validationResults && typeof asset.validationResults === 'object' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Resultados de Validación</h2>
            <div className="space-y-4">
              {asset.validationResults.investmentRules && (
                <div>
                  <h3 className="font-semibold mb-2">Reglas de Inversión</h3>
                  <div className="space-y-2">
                    {Array.isArray(asset.validationResults.investmentRules) && 
                      asset.validationResults.investmentRules.map((rule: any, index: number) => (
                        <div 
                          key={index} 
                          className={`p-3 rounded border ${
                            rule.compliant 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-yellow-50 border-yellow-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {rule.compliant ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-yellow-600" />
                            )}
                            <span className="font-medium">{rule.status}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{rule.message}</p>
                          {rule.details && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {JSON.stringify(rule.details)}
                            </p>
                          )}
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
              {asset.validationResults.mortgageRules && (
                <div>
                  <h3 className="font-semibold mb-2">Reglas de Préstamo Hipotecario</h3>
                  <div className="space-y-2">
                    {Array.isArray(asset.validationResults.mortgageRules) && 
                      asset.validationResults.mortgageRules.map((rule: any, index: number) => (
                        <div 
                          key={index} 
                          className={`p-3 rounded border ${
                            rule.compliant 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-yellow-50 border-yellow-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {rule.compliant ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-yellow-600" />
                            )}
                            <span className="font-medium">{rule.status}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{rule.message}</p>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Acciones */}
        <div className="flex gap-4">
          <Button variant="outline" asChild>
            <Link to="/assets">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Lista
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/trusts/${asset.trustId}`}>
              <FileText className="h-4 w-4 mr-2" />
              Ver Fideicomiso
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AssetDetailPage() {
  return (
    <ProtectedRoute>
      <AssetDetail />
    </ProtectedRoute>
  );
}
