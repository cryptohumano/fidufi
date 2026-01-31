/**
 * Servicio de Estructura Organizacional
 * 
 * Proporciona información sobre la estructura organizacional del fideicomiso,
 * incluyendo roles, relaciones y jerarquías.
 */

import { prisma } from '../lib/prisma';
import { ActorRole } from '../generated/prisma/enums';

export interface OrganizationMember {
  id: string;
  name: string | null;
  email: string | null;
  role: ActorRole;
  roleInTrust: ActorRole;
  assignedAt: Date;
  active: boolean;
}

export interface OrganizationStructure {
  trustId: string;
  trustName: string | null;
  members: {
    fiduciarios: OrganizationMember[];
    comiteTecnico: OrganizationMember[];
    auditores: OrganizationMember[];
    reguladores: OrganizationMember[];
    beneficiarios: OrganizationMember[];
  };
  totalMembers: number;
  mermaidDiagram: string; // Diagrama en formato Mermaid
}

/**
 * Obtiene la estructura organizacional completa de un fideicomiso
 */
export async function getOrganizationStructure(trustId: string): Promise<OrganizationStructure> {
  const trust = await prisma.trust.findUnique({
    where: { trustId },
  });

  if (!trust) {
    throw new Error(`Fideicomiso ${trustId} no encontrado`);
  }

  // Obtener todos los miembros del fideicomiso con sus roles
  const memberships = await prisma.actorTrust.findMany({
    where: {
      trustId,
      active: true,
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: [
      { roleInTrust: 'asc' },
      { assignedAt: 'desc' },
    ],
  });

  // Organizar miembros por rol
  const fiduciarios: OrganizationMember[] = [];
  const comiteTecnico: OrganizationMember[] = [];
  const auditores: OrganizationMember[] = [];
  const reguladores: OrganizationMember[] = [];
  const beneficiarios: OrganizationMember[] = [];

  memberships.forEach((membership) => {
    const member: OrganizationMember = {
      id: membership.actor.id,
      name: membership.actor.name,
      email: membership.actor.email,
      role: membership.actor.role,
      roleInTrust: membership.roleInTrust,
      assignedAt: membership.assignedAt,
      active: membership.active,
    };

    switch (membership.roleInTrust) {
      case ActorRole.FIDUCIARIO:
        fiduciarios.push(member);
        break;
      case ActorRole.COMITE_TECNICO:
        comiteTecnico.push(member);
        break;
      case ActorRole.AUDITOR:
        auditores.push(member);
        break;
      case ActorRole.REGULADOR:
        reguladores.push(member);
        break;
      case ActorRole.BENEFICIARIO:
        beneficiarios.push(member);
        break;
    }
  });

  // Generar diagrama Mermaid
  const mermaidDiagram = generateMermaidDiagram({
    trustId,
    trustName: trust.name,
    fiduciarios,
    comiteTecnico,
    auditores,
    reguladores,
    beneficiarios,
  });

  return {
    trustId,
    trustName: trust.name,
    members: {
      fiduciarios,
      comiteTecnico,
      auditores,
      reguladores,
      beneficiarios,
    },
    totalMembers: memberships.length,
    mermaidDiagram,
  };
}

/**
 * Genera un diagrama Mermaid de la estructura organizacional
 */
function generateMermaidDiagram(data: {
  trustId: string;
  trustName: string | null;
  fiduciarios: OrganizationMember[];
  comiteTecnico: OrganizationMember[];
  auditores: OrganizationMember[];
  reguladores: OrganizationMember[];
  beneficiarios: OrganizationMember[];
}): string {
  const trustName = data.trustName || `Fideicomiso ${data.trustId}`;
  
  let diagram = `graph TB
    Trust["${trustName}<br/>ID: ${data.trustId}"]
    
    subgraph Fiduciarios["🏦 Fiduciarios"]
`;

  // Agregar fiduciarios
  data.fiduciarios.forEach((member, index) => {
    const name = member.name || member.email || `Fiduciario ${index + 1}`;
    const shortId = member.id.substring(0, 8);
    diagram += `      F${index}["${name}<br/>${shortId}"]\n`;
  });

  diagram += `    end
    
    subgraph Comite["👥 Comité Técnico"]
`;

  // Agregar comité técnico
  data.comiteTecnico.forEach((member, index) => {
    const name = member.name || member.email || `Miembro ${index + 1}`;
    const shortId = member.id.substring(0, 8);
    diagram += `      CT${index}["${name}<br/>${shortId}"]\n`;
  });

  diagram += `    end
    
    subgraph Auditores["🔍 Auditores"]
`;

  // Agregar auditores
  data.auditores.forEach((member, index) => {
    const name = member.name || member.email || `Auditor ${index + 1}`;
    const shortId = member.id.substring(0, 8);
    diagram += `      A${index}["${name}<br/>${shortId}"]\n`;
  });

  diagram += `    end
    
    subgraph Reguladores["🛡️ Reguladores"]
`;

  // Agregar reguladores
  data.reguladores.forEach((member, index) => {
    const name = member.name || member.email || `Regulador ${index + 1}`;
    const shortId = member.id.substring(0, 8);
    diagram += `      R${index}["${name}<br/>${shortId}"]\n`;
  });

  diagram += `    end
    
    subgraph Beneficiarios["👤 Beneficiarios"]
`;

  // Agregar beneficiarios (máximo 5 para no saturar el diagrama)
  const beneficiariosToShow = data.beneficiarios.slice(0, 5);
  beneficiariosToShow.forEach((member, index) => {
    const name = member.name || member.email || `Beneficiario ${index + 1}`;
    const shortId = member.id.substring(0, 8);
    diagram += `      B${index}["${name}<br/>${shortId}"]\n`;
  });

  if (data.beneficiarios.length > 5) {
    diagram += `      BMore["... y ${data.beneficiarios.length - 5} más"]\n`;
  }

  diagram += `    end
    
    Trust --> Fiduciarios
    Trust --> Comite
    Trust --> Auditores
    Trust --> Reguladores
    Trust --> Beneficiarios
    
    style Trust fill:#3b82f6,stroke:#1e40af,stroke-width:3px,color:#fff
    style Fiduciarios fill:#10b981,stroke:#059669,stroke-width:2px
    style Comite fill:#f59e0b,stroke:#d97706,stroke-width:2px
    style Auditores fill:#6366f1,stroke:#4f46e5,stroke-width:2px
    style Reguladores fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px
    style Beneficiarios fill:#ec4899,stroke:#db2777,stroke-width:2px
`;

  return diagram;
}

/**
 * Obtiene un resumen simple de la organización (solo conteos)
 */
export async function getOrganizationSummary(trustId: string) {
  const structure = await getOrganizationStructure(trustId);
  
  return {
    trustId: structure.trustId,
    trustName: structure.trustName,
    counts: {
      fiduciarios: structure.members.fiduciarios.length,
      comiteTecnico: structure.members.comiteTecnico.length,
      auditores: structure.members.auditores.length,
      reguladores: structure.members.reguladores.length,
      beneficiarios: structure.members.beneficiarios.length,
      total: structure.totalMembers,
    },
  };
}
