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
import { Plus, FileText, XCircle, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTrustSelection } from '../contexts/TrustSelectionContext';
import { AssetsDataTable } from '../components/assets/AssetsDataTable';

const ITEMS_PER_PAGE = 10;

const ASSET_TYPES = [
  { value: '', label: 'Todos los tipos' },
  { value: 'GovernmentBond', label: 'Bono Gubernamental' },
  { value: 'MortgageLoan', label: 'Préstamo Hipotecario' },
  { value: 'InsuranceReserve', label: 'Reserva de Seguros' },
  { value: 'CNBVApproved', label: 'Valor CNBV' },
  { value: 'SocialHousing', label: 'Vivienda Social' },
] as const;

const COMPLIANCE_STATUSES = [
  { value: '', label: 'Todos los estados' },
  { value: 'COMPLIANT', label: 'Cumpliente' },
  { value: 'NON_COMPLIANT', label: 'No Cumpliente' },
  { value: 'PENDING_REVIEW', label: 'Pendiente de Revisión' },
  { value: 'EXCEPTION_APPROVED', label: 'Excepción Aprobada' },
] as const;

function AssetsList() {
  const { actor } = useAuth();
  const { selectedTrustId } = useTrustSelection();
  const [selectedAssetType, setSelectedAssetType] = useState<string>('');
  const [selectedComplianceStatus, setSelectedComplianceStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Para beneficiarios, el backend filtra automáticamente basado en el rol
  // No necesitamos pasar beneficiaryId explícitamente, el backend lo detecta del token
  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', selectedTrustId, actor?.id, actor?.role, selectedAssetType, selectedComplianceStatus, currentPage],
    queryFn: () => {
      const filters: {
        assetType?: string;
        complianceStatus?: string;
        limit: number;
        offset: number;
      } = {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
      };
      
      // Solo agregar filtros si hay valores seleccionados
      if (selectedAssetType) {
        filters.assetType = selectedAssetType;
      }
      if (selectedComplianceStatus) {
        filters.complianceStatus = selectedComplianceStatus;
      }
      
      return assetsApi.list(selectedTrustId, filters);
    },
    enabled: !!actor && !!selectedTrustId,
  });

  // Resetear a página 1 cuando cambia cualquier filtro
  const handleAssetTypeChange = (value: string) => {
    setSelectedAssetType(value);
    setCurrentPage(1);
  };

  const handleComplianceStatusChange = (value: string) => {
    setSelectedComplianceStatus(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedAssetType('');
    setSelectedComplianceStatus('');
    setCurrentPage(1);
  };

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
              : `Fideicomiso 10045 - Total: ${data?.total || 0} activos`
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

      {/* Filtros */}
      <Card className="p-4 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Filtros</h3>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="asset-type-filter" className="text-sm font-medium">
                Tipo:
              </label>
              <select
                id="asset-type-filter"
                value={selectedAssetType}
                onChange={(e) => handleAssetTypeChange(e.target.value)}
                className="flex h-9 w-full md:w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ASSET_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="compliance-status-filter" className="text-sm font-medium">
                Estado:
              </label>
              <select
                id="compliance-status-filter"
                value={selectedComplianceStatus}
                onChange={(e) => handleComplianceStatusChange(e.target.value)}
                className="flex h-9 w-full md:w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {COMPLIANCE_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            {(selectedAssetType || selectedComplianceStatus) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-sm"
              >
                Limpiar filtros
              </Button>
            )}
            {data?.total !== undefined && (selectedAssetType || selectedComplianceStatus) && (
              <div className="ml-auto text-sm text-muted-foreground">
                <span className="font-medium">
                  {data.total} {data.total === 1 ? 'activo encontrado' : 'activos encontrados'}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {assets.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {selectedAssetType
              ? 'No hay activos de este tipo'
              : isBeneficiario
              ? 'No tienes activos asociados'
              : 'No hay activos registrados'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {selectedAssetType
              ? 'Intenta cambiar el filtro o registrar un activo de este tipo.'
              : isBeneficiario
              ? 'Los activos aparecerán aquí cuando el fiduciario registre activos asociados a tu cuenta.'
              : 'Comienza registrando el primer activo del fideicomiso.'}
          </p>
          {canRegister && !selectedAssetType && (
            <Button asChild>
              <Link to="/assets/register">Registrar Primer Activo</Link>
            </Button>
          )}
        </Card>
      ) : (
                    <AssetsDataTable
                      data={assets}
                      total={data?.total || 0}
                      currentPage={currentPage}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setCurrentPage}
                      isBeneficiario={isBeneficiario}
                      userRole={actor?.role}
                    />
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
