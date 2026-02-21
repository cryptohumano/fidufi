/**
 * Servicio para manejar votaciones de excepciones del Comité Técnico
 * 
 * Cuando un fideicomiso tiene requiresConsensus = true, las excepciones
 * requieren mayoría (2 de 3 miembros) para ser aprobadas.
 */

import { prisma } from '../lib/prisma';
import { ComplianceStatus, ActorRole } from '../generated/prisma/enums';
import { getActorById } from './actorService';
import { createAuditLog, AuditAction, EntityType } from './auditLogService';
import { AlertType, AlertSubtype } from './alertGenerationService';

export interface VoteExceptionData {
  assetId: string;
  voterId: string;
  vote: 'APPROVE' | 'REJECT';
  reason?: string;
  requestInfo?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

/**
 * Registra un voto de un miembro del Comité Técnico para una excepción
 */
export async function voteException(data: VoteExceptionData) {
  // 1. Verificar que el activo existe y está en PENDING_REVIEW
  const asset = await prisma.asset.findUnique({
    where: { id: data.assetId },
    include: {
      actor: true,
      beneficiary: true,
    },
  });

  if (!asset) {
    throw new Error(`Activo ${data.assetId} no encontrado`);
  }

  if (asset.complianceStatus !== ComplianceStatus.PENDING_REVIEW) {
    throw new Error(`El activo no está pendiente de revisión. Estado actual: ${asset.complianceStatus}`);
  }

  // 2. Obtener información del fideicomiso
  const trust = await prisma.trust.findUnique({
    where: { trustId: asset.trustId },
  });

  if (!trust) {
    throw new Error(`Fideicomiso ${asset.trustId} no encontrado`);
  }

  // 3. Verificar que el votante es miembro del Comité Técnico
  const voter = await getActorById(data.voterId);
  if (voter.role !== ActorRole.COMITE_TECNICO && !voter.isSuperAdmin) {
    throw new Error('Solo miembros del Comité Técnico pueden votar');
  }

  // 4. Verificar que el votante pertenece al fideicomiso
  if (!voter.isSuperAdmin) {
    const { verifyActorTrustMembership } = await import('./actorTrustService');
    const hasAccess = await verifyActorTrustMembership(
      data.voterId,
      asset.trustId,
      [ActorRole.COMITE_TECNICO]
    );
    
    if (!hasAccess) {
      throw new Error('No eres miembro del Comité Técnico de este fideicomiso');
    }
  }

  // 5. Verificar si ya votó
  const existingVote = await prisma.exceptionVote.findUnique({
    where: {
      assetId_voterId: {
        assetId: data.assetId,
        voterId: data.voterId,
      },
    },
  });

  if (existingVote) {
    throw new Error('Ya has votado por esta excepción');
  }

  // 6. Registrar el voto
  const vote = await prisma.exceptionVote.create({
    data: {
      assetId: data.assetId,
      trustId: asset.trustId,
      voterId: data.voterId,
      vote: data.vote,
      reason: data.reason || null,
      ipAddress: data.requestInfo?.ipAddress || null,
      userAgent: data.requestInfo?.userAgent || null,
    },
    include: {
      voter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // 7. Verificar si se requiere consenso
  const requiresConsensus = trust.requiresConsensus;

  if (requiresConsensus) {
    // Obtener todos los miembros del Comité Técnico del fideicomiso
    const { getTrustActors } = await import('./actorTrustService');
    const comiteMembers = await getTrustActors(asset.trustId, ActorRole.COMITE_TECNICO);
    const totalMembers = comiteMembers.length;
    
    // Obtener todos los votos para este activo
    const allVotes = await prisma.exceptionVote.findMany({
      where: { assetId: data.assetId },
      include: {
        voter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const approveVotes = allVotes.filter(v => v.vote === 'APPROVE').length;
    const rejectVotes = allVotes.filter(v => v.vote === 'REJECT').length;
    
    // Calcular mayoría (2 de 3, o mayoría simple si hay más miembros)
    const majority = Math.ceil(totalMembers / 2);
    
    // Si se alcanzó mayoría de aprobaciones, aprobar automáticamente
    if (approveVotes >= majority) {
      await approveExceptionDirectly(
        data.assetId,
        data.voterId,
        `Aprobado por mayoría del Comité Técnico (${approveVotes}/${totalMembers} votos a favor)`,
        data.requestInfo,
        allVotes
      );
      
      // Enviar notificaciones a otros miembros
      await notifyOtherMembers(asset.trustId, data.assetId, 'APPROVED', allVotes);
    } else if (rejectVotes >= majority) {
      // Si se alcanzó mayoría de rechazos, rechazar automáticamente
      await rejectExceptionDirectly(
        data.assetId,
        data.voterId,
        `Rechazado por mayoría del Comité Técnico (${rejectVotes}/${totalMembers} votos en contra)`,
        data.requestInfo,
        allVotes
      );
      
      await notifyOtherMembers(asset.trustId, data.assetId, 'REJECTED', allVotes);
    } else {
      // Aún no hay mayoría, enviar notificación a otros miembros para que voten
      await notifyOtherMembers(asset.trustId, data.assetId, 'PENDING', allVotes);
    }

    // Registrar log de auditoría
    try {
      await createAuditLog({
        actorId: data.voterId,
        action: AuditAction.EXCEPTION_APPROVED, // O EXCEPTION_REJECTED según el voto
        entityType: EntityType.ASSET,
        entityId: data.assetId,
        trustId: asset.trustId,
        description: `Voto registrado: ${data.vote === 'APPROVE' ? 'Aprobación' : 'Rechazo'} de excepción para activo ${data.assetId}. Votos actuales: ${approveVotes} a favor, ${rejectVotes} en contra`,
        metadata: {
          vote: data.vote,
          reason: data.reason,
          totalVotes: allVotes.length,
          approveVotes,
          rejectVotes,
          majority,
          requiresConsensus: true,
        },
        ipAddress: data.requestInfo?.ipAddress,
        userAgent: data.requestInfo?.userAgent,
      });
    } catch (error) {
      console.error('⚠️  Error registrando log de auditoría:', error);
    }
  } else {
    // No requiere consenso, el voto individual aprueba/rechaza directamente
    if (data.vote === 'APPROVE') {
      const { approveException } = await import('./assetService');
      await approveException(
        data.assetId,
        data.voterId,
        data.reason || 'Aprobado por miembro del Comité Técnico',
        data.requestInfo
      );
    } else {
      const { rejectException } = await import('./assetService');
      await rejectException(
        data.assetId,
        data.voterId,
        data.reason || 'Rechazado por miembro del Comité Técnico',
        data.requestInfo
      );
    }
  }

  return {
    vote,
    requiresConsensus,
    totalVotes: requiresConsensus ? await prisma.exceptionVote.count({ where: { assetId: data.assetId } }) : 1,
  };
}

/**
 * Obtiene el estado de votación de una excepción
 */
export async function getVotingStatus(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    throw new Error(`Activo ${assetId} no encontrado`);
  }

  const trust = await prisma.trust.findUnique({
    where: { trustId: asset.trustId },
  });

  if (!trust) {
    throw new Error(`Fideicomiso ${asset.trustId} no encontrado`);
  }

  const requiresConsensus = trust.requiresConsensus;

  if (!requiresConsensus) {
    return {
      requiresConsensus: false,
      votes: [],
      status: 'INDIVIDUAL', // Un solo miembro puede aprobar/rechazar
    };
  }

  // Obtener todos los miembros del Comité Técnico
  const { getTrustActors } = await import('./actorTrustService');
  const comiteMembers = await getTrustActors(asset.trustId, ActorRole.COMITE_TECNICO);
  const totalMembers = comiteMembers.length;
  const majority = Math.ceil(totalMembers / 2);

  // Obtener todos los votos
  const votes = await prisma.exceptionVote.findMany({
    where: { assetId },
    include: {
      voter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const approveVotes = votes.filter(v => v.vote === 'APPROVE').length;
  const rejectVotes = votes.filter(v => v.vote === 'REJECT').length;
  const pendingVotes = totalMembers - votes.length;

  let status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
  if (approveVotes >= majority) {
    status = 'APPROVED';
  } else if (rejectVotes >= majority) {
    status = 'REJECTED';
  }

  return {
    requiresConsensus: true,
    totalMembers,
    majority,
    votes,
    approveVotes,
    rejectVotes,
    pendingVotes,
    status,
  };
}

/**
 * Aprueba una excepción directamente sin verificar consenso
 * (Usado internamente cuando se alcanza mayoría)
 */
async function approveExceptionDirectly(
  assetId: string,
  approvedBy: string,
  reason: string,
  requestInfo?: { ipAddress?: string; userAgent?: string },
  votes?: any[]
) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      actor: true,
      beneficiary: true,
    },
  });

  if (!asset) {
    throw new Error(`Activo ${assetId} no encontrado`);
  }

  const actor = await getActorById(approvedBy);

  // Actualizar el activo
  const updatedAsset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      complianceStatus: ComplianceStatus.EXCEPTION_APPROVED,
      compliant: true,
      validationResults: {
        ...(asset.validationResults as any || {}),
        exceptionApproval: {
          approvedBy: actor.id,
          approvedByName: actor.name,
          approvedAt: new Date().toISOString(),
          reason,
          approvedByConsensus: true,
          votes: votes?.map(v => ({
            voterId: v.voterId,
            voterName: v.voter?.name,
            vote: v.vote,
            votedAt: v.createdAt,
          })),
        },
      } as any,
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      beneficiary: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Crear alertas
  const { getTrustActors } = await import('./actorTrustService');
  const fiduciarios = await getTrustActors(asset.trustId, ActorRole.FIDUCIARIO);
  
  const approvalMessage = `Excepción aprobada por mayoría del Comité Técnico. ${reason}`;
  
  for (const membership of fiduciarios) {
    await prisma.alert.create({
      data: {
        assetId: asset.id,
        actorId: membership.actorId,
        message: approvalMessage,
        severity: 'info',
        alertType: AlertType.COMPLIANCE,
        alertSubtype: AlertSubtype.EXCEPTION_APPROVED,
        metadata: {
          approvedBy: actor.id,
          approvedByName: actor.name,
          reason,
          consensusApproval: true,
        },
      },
    });
  }

  // Registrar log
  try {
    await createAuditLog({
      actorId: approvedBy,
      action: AuditAction.EXCEPTION_APPROVED,
      entityType: EntityType.ASSET,
      entityId: assetId,
      trustId: asset.trustId,
      description: `Excepción aprobada por mayoría del Comité Técnico. ${reason}`,
      metadata: {
        assetType: asset.assetType,
        valueMxn: asset.valueMxn.toString(),
        reason,
        consensusApproval: true,
        totalVotes: votes?.length || 0,
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });
  } catch (error) {
    console.error('⚠️  Error registrando log de auditoría:', error);
  }

  return updatedAsset;
}

/**
 * Rechaza una excepción directamente sin verificar consenso
 * (Usado internamente cuando se alcanza mayoría)
 */
async function rejectExceptionDirectly(
  assetId: string,
  rejectedBy: string,
  reason: string,
  requestInfo?: { ipAddress?: string; userAgent?: string },
  votes?: any[]
) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      actor: true,
      beneficiary: true,
    },
  });

  if (!asset) {
    throw new Error(`Activo ${assetId} no encontrado`);
  }

  const actor = await getActorById(rejectedBy);

  // Actualizar el activo
  const updatedAsset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      complianceStatus: ComplianceStatus.NON_COMPLIANT,
      compliant: false,
      validationResults: {
        ...(asset.validationResults as any || {}),
        exceptionRejection: {
          rejectedBy: actor.id,
          rejectedByName: actor.name,
          rejectedAt: new Date().toISOString(),
          reason,
          rejectedByConsensus: true,
          votes: votes?.map(v => ({
            voterId: v.voterId,
            voterName: v.voter?.name,
            vote: v.vote,
            votedAt: v.createdAt,
          })),
        },
      } as any,
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      beneficiary: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Crear alertas
  const { getTrustActors } = await import('./actorTrustService');
  const fiduciarios = await getTrustActors(asset.trustId, ActorRole.FIDUCIARIO);
  
  const rejectionMessage = `Excepción rechazada por mayoría del Comité Técnico. ${reason}`;
  
  for (const membership of fiduciarios) {
    await prisma.alert.create({
      data: {
        assetId: asset.id,
        actorId: membership.actorId,
        message: rejectionMessage,
        severity: 'warning',
        alertType: AlertType.COMPLIANCE,
        alertSubtype: AlertSubtype.EXCEPTION_REJECTED,
        metadata: {
          rejectedBy: actor.id,
          rejectedByName: actor.name,
          reason,
          consensusRejection: true,
        },
      },
    });
  }

  // Registrar log
  try {
    await createAuditLog({
      actorId: rejectedBy,
      action: AuditAction.EXCEPTION_REJECTED,
      entityType: EntityType.ASSET,
      entityId: assetId,
      trustId: asset.trustId,
      description: `Excepción rechazada por mayoría del Comité Técnico. ${reason}`,
      metadata: {
        assetType: asset.assetType,
        valueMxn: asset.valueMxn.toString(),
        reason,
        consensusRejection: true,
        totalVotes: votes?.length || 0,
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });
  } catch (error) {
    console.error('⚠️  Error registrando log de auditoría:', error);
  }

  return updatedAsset;
}

/**
 * Notifica a otros miembros del Comité Técnico sobre votaciones
 * (Por ahora solo crea alertas, en el futuro se puede integrar email/WhatsApp)
 */
async function notifyOtherMembers(
  trustId: string,
  assetId: string,
  status: 'APPROVED' | 'REJECTED' | 'PENDING',
  currentVotes: any[]
) {
  const { getTrustActors } = await import('./actorTrustService');
  const comiteMembers = await getTrustActors(trustId, ActorRole.COMITE_TECNICO);
  
  // Obtener IDs de quienes ya votaron
  const votedMemberIds = currentVotes.map(v => v.voterId);
  
  // Crear alertas para miembros que aún no han votado
  const pendingMembers = comiteMembers.filter(m => !votedMemberIds.includes(m.actorId));
  
  for (const member of pendingMembers) {
    let message = '';
    if (status === 'APPROVED') {
      message = `Una excepción ha sido aprobada por mayoría del Comité Técnico. Ya no es necesario tu voto.`;
    } else if (status === 'REJECTED') {
      message = `Una excepción ha sido rechazada por mayoría del Comité Técnico. Ya no es necesario tu voto.`;
    } else {
      message = `Un miembro del Comité Técnico ha votado sobre una excepción pendiente. Tu voto es necesario para alcanzar la mayoría.`;
    }

    await prisma.alert.create({
      data: {
        assetId,
        actorId: member.actorId,
        message,
        severity: status === 'PENDING' ? 'warning' : 'info',
        alertType: 'COMPLIANCE',
        alertSubtype: 'EXCEPTION_VOTE',
        metadata: {
          status,
          totalVotes: currentVotes.length,
          requiresYourVote: status === 'PENDING',
        },
      },
    });
  }
}
