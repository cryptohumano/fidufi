/**
 * Página para registrar un nuevo activo
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi, RegisterAssetData, trustsApi, actorTrustApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

function RegisterAssetForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { actor } = useAuth();
  const [formData, setFormData] = useState<RegisterAssetData>({
    trustId: '10045',
    assetType: 'GovernmentBond',
    valueMxn: 0,
    description: '',
    beneficiaryId: undefined,
  });

  // Obtener información del fideicomiso
  const { data: trust } = useQuery({
    queryKey: ['trust', formData.trustId],
    queryFn: () => trustsApi.getById(formData.trustId),
  });

  // Obtener beneficiarios del fideicomiso (para préstamos hipotecarios y vivienda social)
  const { data: beneficiaries } = useQuery({
    queryKey: ['trust-actors', formData.trustId, 'BENEFICIARIO'],
    queryFn: () => actorTrustApi.getTrustActors(formData.trustId, 'BENEFICIARIO'),
    enabled: formData.assetType === 'MortgageLoan' || formData.assetType === 'SocialHousing',
  });

  // Limpiar beneficiaryId cuando cambia el tipo de activo
  useEffect(() => {
    if (formData.assetType !== 'MortgageLoan' && formData.assetType !== 'SocialHousing') {
      setFormData({ ...formData, beneficiaryId: undefined });
    }
  }, [formData.assetType]);

  // Mutación para registrar activo
  const registerMutation = useMutation({
    mutationFn: (data: RegisterAssetData) => assetsApi.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['trust', formData.trustId, 'summary'] });
      navigate('/assets');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  const canRegister = actor?.role === 'FIDUCIARIO' || actor?.role === 'COMITE_TECNICO';

  if (!canRegister) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
          <p className="text-muted-foreground mb-6">
            Solo Fiduciarios y miembros del Comité Técnico pueden registrar activos.
          </p>
          <Button onClick={() => navigate('/')}>Volver al inicio</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-6">Registrar Nuevo Activo</h1>

        {trust && (
          <div className="mb-6 p-4 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Fideicomiso:</strong> {trust.name || trust.trustId}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Límites:</strong> {trust.bondLimitPercent}% bonos / {trust.otherLimitPercent}% otros
            </p>
          </div>
        )}

        {registerMutation.isError && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-md">
            {(registerMutation.error as any)?.response?.data?.error || 'Error al registrar activo'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="trustId" className="block text-sm font-medium mb-2">
              ID del Fideicomiso
            </label>
            <Input
              id="trustId"
              value={formData.trustId}
              onChange={(e) => setFormData({ ...formData, trustId: e.target.value })}
              required
            />
          </div>

          <div>
            <label htmlFor="assetType" className="block text-sm font-medium mb-2">
              Tipo de Activo
            </label>
            <select
              id="assetType"
              value={formData.assetType}
              onChange={(e) => setFormData({ ...formData, assetType: e.target.value as any })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
              required
            >
              <option value="GovernmentBond">Bono Gubernamental</option>
              <option value="MortgageLoan">Préstamo Hipotecario</option>
              <option value="InsuranceReserve">Reserva de Seguros</option>
              <option value="CNBVApproved">Valor Aprobado por CNBV</option>
              <option value="SocialHousing">Vivienda Social</option>
            </select>
          </div>

          <div>
            <label htmlFor="valueMxn" className="block text-sm font-medium mb-2">
              Valor en MXN
            </label>
            <Input
              id="valueMxn"
              type="number"
              step="0.01"
              min="0"
              value={formData.valueMxn}
              onChange={(e) => setFormData({ ...formData, valueMxn: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Descripción (opcional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background min-h-[100px]"
              placeholder="Descripción del activo..."
            />
          </div>

          {/* Selector de beneficiario para préstamos hipotecarios y vivienda social */}
          {(formData.assetType === 'MortgageLoan' || formData.assetType === 'SocialHousing') && (
            <div>
              <label htmlFor="beneficiaryId" className="block text-sm font-medium mb-2">
                Beneficiario Asociado {formData.assetType === 'MortgageLoan' ? '(Trabajador)' : '(Trabajador)'} <span className="text-destructive">*</span>
              </label>
              <select
                id="beneficiaryId"
                value={formData.beneficiaryId || ''}
                onChange={(e) => setFormData({ ...formData, beneficiaryId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                required
              >
                <option value="">Seleccionar beneficiario</option>
                {beneficiaries?.map((membership: any) => (
                  <option key={membership.actor.id} value={membership.actor.id}>
                    {membership.actor.name || membership.actor.email || `Beneficiario ${membership.actor.id.substring(0, 8)}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Selecciona el beneficiario (trabajador) al que está asociado este activo. Este campo es obligatorio para préstamos hipotecarios y vivienda social.
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={registerMutation.isPending} className="flex-1">
              {registerMutation.isPending ? 'Registrando...' : 'Registrar Activo'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/assets')}>
              Cancelar
            </Button>
          </div>
        </form>

        {registerMutation.isSuccess && registerMutation.data && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              {registerMutation.data.compliant ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-600">Activo registrado correctamente</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-600">Activo registrado con advertencias</span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Estado: {registerMutation.data.complianceStatus}
            </p>
            {registerMutation.data.asset.vcHash && (
              <p className="text-xs text-muted-foreground mt-2">
                VC Hash: {registerMutation.data.asset.vcHash.substring(0, 20)}...
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export function RegisterAssetPage() {
  return (
    <ProtectedRoute>
      <RegisterAssetForm />
    </ProtectedRoute>
  );
}
