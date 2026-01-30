/**
 * Página para listar activos
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assetsApi } from '../lib/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { Link } from 'react-router-dom';
import { Plus, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function AssetsList() {
  const { actor } = useAuth();
  const [trustId] = useState('10045');

  // Para beneficiarios, el backend filtra automáticamente basado en el rol
  // No necesitamos pasar beneficiaryId explícitamente, el backend lo detecta del token
  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', trustId, actor?.id, actor?.role],
    queryFn: () => assetsApi.list(trustId),
    enabled: !!actor,
  });

  const canRegister = actor?.role === 'FIDUCIARIO' || actor?.role === 'COMITE_TECNICO';
  const isBeneficiario = actor?.role === 'BENEFICIARIO';

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando activos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive">Error al cargar activos</p>
      </div>
    );
  }

  const assets = data?.assets || [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {isBeneficiario ? 'Mis Activos' : 'Activos del Fideicomiso'}
          </h1>
          <p className="text-muted-foreground">
            {isBeneficiario 
              ? 'Activos asociados a tu cuenta en el fideicomiso 10045'
              : `Fideicomiso 10045 - Total: ${assets.length} activos`
            }
          </p>
        </div>
        {canRegister && (
          <Button asChild>
            <Link to="/assets/register">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Activo
            </Link>
          </Button>
        )}
      </div>

      {assets.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {isBeneficiario ? 'No tienes activos asociados' : 'No hay activos registrados'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {isBeneficiario 
              ? 'Los activos aparecerán aquí cuando el fiduciario registre activos asociados a tu cuenta.'
              : 'Comienza registrando el primer activo del fideicomiso.'
            }
          </p>
          {canRegister && (
            <Button asChild>
              <Link to="/assets/register">Registrar Primer Activo</Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {assets.map((asset) => (
            <Card key={asset.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">
                      {asset.assetType === 'GovernmentBond' && 'Bono Gubernamental'}
                      {asset.assetType === 'MortgageLoan' && 'Préstamo Hipotecario'}
                      {asset.assetType === 'InsuranceReserve' && 'Reserva de Seguros'}
                      {asset.assetType === 'CNBVApproved' && 'Valor CNBV'}
                      {asset.assetType === 'SocialHousing' && 'Vivienda Social'}
                    </h3>
                    {asset.compliant ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {asset.description || 'Sin descripción'}
                  </p>
                  <div className="flex gap-6 text-sm flex-wrap">
                    <div>
                      <span className="text-muted-foreground">Valor: </span>
                      <span className="font-semibold">
                        ${parseFloat(asset.valueMxn).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estado: </span>
                      <span className={`font-semibold ${
                        asset.compliant ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {asset.complianceStatus}
                      </span>
                    </div>
                    {asset.beneficiary && (
                      <div>
                        <span className="text-muted-foreground">Beneficiario: </span>
                        <span className="font-semibold">
                          {asset.beneficiary.name || asset.beneficiary.email || 'Sin nombre'}
                        </span>
                      </div>
                    )}
                    {asset.actor && !isBeneficiario && (
                      <div>
                        <span className="text-muted-foreground">Registrado por: </span>
                        <span className="font-semibold">
                          {asset.actor.name || asset.actor.role}
                        </span>
                      </div>
                    )}
                    {asset.blockchainNetwork && (
                      <div>
                        <span className="text-muted-foreground">Blockchain: </span>
                        <span className="font-semibold">{asset.blockchainNetwork}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/assets/${asset.id}`}>Ver Detalles</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function AssetsPage() {
  return (
    <ProtectedRoute>
      <AssetsList />
    </ProtectedRoute>
  );
}
