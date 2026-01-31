/**
 * Componente para mostrar lista de miembros organizados por rol
 */

import { Card } from '../ui/card';
import { Users, Shield, Eye, FileCheck, UserCheck } from 'lucide-react';

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  roleInTrust: string;
  assignedAt: string;
  active: boolean;
}

interface OrganizationMembersProps {
  members: {
    fiduciarios: Member[];
    comiteTecnico: Member[];
    auditores: Member[];
    reguladores: Member[];
    beneficiarios: Member[];
  };
}

const roleIcons: Record<string, any> = {
  FIDUCIARIO: Shield,
  COMITE_TECNICO: Users,
  AUDITOR: Eye,
  REGULADOR: FileCheck,
  BENEFICIARIO: UserCheck,
};

const roleLabels: Record<string, string> = {
  FIDUCIARIO: 'Fiduciarios',
  COMITE_TECNICO: 'Comité Técnico',
  AUDITOR: 'Auditores',
  REGULADOR: 'Reguladores',
  BENEFICIARIO: 'Beneficiarios',
};

export function OrganizationMembers({ members }: OrganizationMembersProps) {
  const renderRoleSection = (
    roleKey: keyof typeof members,
    roleLabel: string,
    Icon: any
  ) => {
    const roleMembers = members[roleKey];
    if (roleMembers.length === 0) return null;

    return (
      <div key={roleKey} className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{roleLabel}</h3>
          <span className="text-sm text-muted-foreground">
            ({roleMembers.length})
          </span>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {roleMembers.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium">
                    {member.name || member.email || 'Sin nombre'}
                  </p>
                  {member.email && (
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    ID: {member.id.substring(0, 8)}...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Asignado: {new Date(member.assignedAt).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    member.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {member.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Miembros del Fideicomiso</h2>
      </div>
      
      <div className="space-y-6">
        {renderRoleSection('fiduciarios', 'Fiduciarios', roleIcons.FIDUCIARIO)}
        {renderRoleSection('comiteTecnico', 'Comité Técnico', roleIcons.COMITE_TECNICO)}
        {renderRoleSection('auditores', 'Auditores', roleIcons.AUDITOR)}
        {renderRoleSection('reguladores', 'Reguladores', roleIcons.REGULADOR)}
        {renderRoleSection('beneficiarios', 'Beneficiarios', roleIcons.BENEFICIARIO)}
      </div>
    </Card>
  );
}
