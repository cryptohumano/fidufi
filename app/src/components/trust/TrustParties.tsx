/**
 * Componente para mostrar las partes involucradas en el fideicomiso
 */

import { useQuery } from '@tanstack/react-query';
import { trustsApi } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Users, Building2, UserCheck, Shield, FileText, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TrustPartiesProps {
  trustId: string;
}

export function TrustParties({ trustId }: TrustPartiesProps) {
  const { data: parties, isLoading } = useQuery({
    queryKey: ['trust', trustId, 'parties'],
    queryFn: () => trustsApi.getParties(trustId),
    enabled: !!trustId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!parties) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No hay información de partes disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fideicomitente y Fiduciario */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Fideicomitente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <label className="text-sm text-muted-foreground">Nombre</label>
                <p className="font-semibold">
                  {parties.fideicomitente.name || 'No especificado'}
                </p>
              </div>
              {parties.fideicomitente.rfc && (
                <div>
                  <label className="text-sm text-muted-foreground">RFC</label>
                  <p className="font-mono text-sm">{parties.fideicomitente.rfc}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Fiduciario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <label className="text-sm text-muted-foreground">Institución</label>
                <p className="font-semibold">
                  {parties.fiduciario.name || 'No especificado'}
                </p>
              </div>
              {parties.fiduciario.rfc && (
                <div>
                  <label className="text-sm text-muted-foreground">RFC</label>
                  <p className="font-mono text-sm">{parties.fiduciario.rfc}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comité Técnico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Comité Técnico ({parties.comiteTecnico.length} miembros)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {parties.comiteTecnico.length > 0 ? (
            <div className="space-y-3">
              {parties.comiteTecnico.map((member) => (
                <div
                  key={member.actorId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{member.name || 'Sin nombre'}</p>
                      {member.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">Miembro</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No hay miembros asignados</p>
          )}
        </CardContent>
      </Card>

      {/* Beneficiarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Beneficiarios ({parties.beneficiarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {parties.beneficiarios.length > 0 ? (
            <div className="space-y-3">
              {parties.beneficiarios.map((beneficiary) => (
                <div
                  key={beneficiary.actorId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">{beneficiary.name || 'Sin nombre'}</p>
                      {beneficiary.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {beneficiary.email}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {beneficiary.assetsCount} activo{beneficiary.assetsCount !== 1 ? 's' : ''} • 
                        ${beneficiary.totalValue.toLocaleString('es-MX')} MXN
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Beneficiario</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No hay beneficiarios asignados</p>
          )}
        </CardContent>
      </Card>

      {/* Auditores y Reguladores */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Auditores ({parties.auditores.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {parties.auditores.length > 0 ? (
              <div className="space-y-2">
                {parties.auditores.map((auditor) => (
                  <div
                    key={auditor.actorId}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <p className="text-sm font-semibold">{auditor.name || 'Sin nombre'}</p>
                      {auditor.email && (
                        <p className="text-xs text-muted-foreground">{auditor.email}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay auditores asignados</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Reguladores ({parties.reguladores.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {parties.reguladores.length > 0 ? (
              <div className="space-y-2">
                {parties.reguladores.map((regulador) => (
                  <div
                    key={regulador.actorId}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <p className="text-sm font-semibold">{regulador.name || 'Sin nombre'}</p>
                      {regulador.email && (
                        <p className="text-xs text-muted-foreground">{regulador.email}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay reguladores asignados</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
