/**
 * Página de estructura organizacional del fideicomiso
 */

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { trustsApi } from '../lib/api';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { OrganizationDiagram } from '../components/organization/OrganizationDiagram';
import { OrganizationMembers } from '../components/organization/OrganizationMembers';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function OrganizationView() {
  const { trustId } = useParams<{ trustId: string }>();
  const navigate = useNavigate();
  const { actor } = useAuth();

  const { data: organization, isLoading, error } = useQuery({
    queryKey: ['organization', trustId],
    queryFn: () => trustsApi.getOrganization(trustId!),
    enabled: !!trustId && actor?.role !== 'BENEFICIARIO',
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando estructura organizacional...</p>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Error al cargar estructura</h1>
        <p className="text-muted-foreground mb-6">
          {error ? (error as any).message : 'No se pudo cargar la estructura organizacional'}
        </p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Estructura Organizacional</h1>
        </div>
        <p className="text-muted-foreground">
          {organization.trustName || `Fideicomiso ${organization.trustId}`}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Diagrama Mermaid */}
        <div className="lg:col-span-2">
          <OrganizationDiagram
            mermaidDiagram={organization.mermaidDiagram}
            trustName={organization.trustName}
            totalMembers={organization.totalMembers}
          />
        </div>
      </div>

      {/* Lista de Miembros */}
      <OrganizationMembers members={organization.members} />
    </div>
  );
}

export function OrganizationPage() {
  return (
    <ProtectedRoute>
      <OrganizationView />
    </ProtectedRoute>
  );
}
