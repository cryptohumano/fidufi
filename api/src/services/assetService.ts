/**
 * Asset Service
 * 
 * Lógica de registro de activos con validación completa de reglas
 * Este es el servicio crítico que implementa el flujo principal del MVP
 */

import { prisma } from '../lib/prisma';
import { AssetType, ComplianceStatus, ActorRole } from '../generated/prisma/enums';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';
import {
  validateInvestmentRules,
  type InvestmentRuleContext,
} from '../rules/investmentRules';
import {
  validateMortgageLoan,
  type MortgageLoanData,
} from '../rules/mortgageRules';
import { validateFiduciarioFeesPaid, type FiduciarioFeeStatus } from '../rules/fiduciarioFeeRules';
import { getTrust } from './trustService';
import { getActorById } from './actorService';
import { AlertType, AlertSubtype } from './alertGenerationService';

export interface RegisterAssetData {
  trustId: string;
  assetType: AssetType;
  valueMxn: number | Decimal;
  description?: string;
  documentHash?: string;
  beneficiaryId?: string; // Actor.id del beneficiario (opcional, para préstamos hipotecarios y vivienda social)
  
  // Datos específicos para préstamos hipotecarios
  mortgageData?: {
    price: number | Decimal;
    loanAmount: number | Decimal;
    termYears: number;
    monthlyPayment: number | Decimal;
    hasMortgageGuarantee: boolean;
    hasLifeInsurance: boolean;
    hasFireInsurance: boolean;
    interestRate: number | Decimal;
    areaMinimumWage: number | Decimal;
    maxBondYieldRate?: number | Decimal;
  };
  
  registeredBy: string; // Actor.id
  requestInfo?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface AssetRegistrationResult {
  asset: any;
  compliant: boolean;
  complianceStatus: ComplianceStatus;
  validationResults: any[];
  alerts: any[];
}

/**
 * Registra un nuevo activo en el fideicomiso con validación completa
 * 
 * Flujo:
 * 1. Validar honorarios del fiduciario
 * 2. Obtener activos existentes
 * 3. Aplicar reglas de inversión
 * 4. Aplicar reglas específicas (préstamos hipotecarios)
 * 5. Determinar cumplimiento
 * 6. Guardar en DB
 * 7. Generar alertas si no cumple
 * 8. (Futuro) Generar VC y anclar en blockchain
 */
export async function registerAsset(data: RegisterAssetData): Promise<AssetRegistrationResult> {
  // 1. Validar que el fideicomiso existe
  const trust = await getTrust(data.trustId);

  // 2. Validar que el actor existe y tiene permisos
  const actor = await getActorById(data.registeredBy);
  
  // 3. Verificar pertenencia al fideicomiso (excepto para SUPER_ADMIN)
  if (actor.role !== 'SUPER_ADMIN' && !actor.isSuperAdmin) {
    const { verifyActorTrustMembership } = await import('./actorTrustService');
    const hasAccess = await verifyActorTrustMembership(
      data.registeredBy,
      data.trustId,
      ['FIDUCIARIO', 'COMITE_TECNICO']
    );
    
    if (!hasAccess) {
      throw new Error(`No tienes acceso a este fideicomiso o no tienes permisos para registrar activos`);
    }
  } else {
    // Para SUPER_ADMIN, verificar que tiene el rol adecuado globalmente
    if (!['FIDUCIARIO', 'COMITE_TECNICO'].includes(actor.role)) {
      throw new Error(`El rol ${actor.role} no tiene permisos para registrar activos`);
    }
  }

  // 3. Validar honorarios del fiduciario están pagados
  const fiduciarioFee = await prisma.fiduciarioFee.findUnique({
    where: { trustId: data.trustId },
    include: {
      monthlyPayments: true,
    },
  });

  if (!fiduciarioFee) {
    throw new Error(`No se encontró registro de honorarios para el fideicomiso ${data.trustId}`);
  }

  const currentDate = new Date();
  const feeStatus: FiduciarioFeeStatus = {
    studyFeePaid: fiduciarioFee.studyFeePaid,
    monthlyPayments: fiduciarioFee.monthlyPayments.map((p) => ({
      year: p.year,
      month: p.month,
      paid: p.paid,
    })),
    currentYear: currentDate.getFullYear(),
    currentMonth: currentDate.getMonth() + 1,
  };

  const feeValidation = validateFiduciarioFeesPaid(feeStatus);
  if (!feeValidation.compliant) {
    throw new Error(`No se puede registrar activo: ${feeValidation.message}`);
  }

  // 4. Obtener activos existentes del fideicomiso
  const existingAssets = await prisma.asset.findMany({
    where: {
      trustId: data.trustId,
      complianceStatus: {
        not: 'PENDING_REVIEW',
      },
    },
    select: {
      assetType: true,
      valueMxn: true,
    },
  });

  // 5. Aplicar reglas de inversión
  const investmentContext: InvestmentRuleContext = {
    trustId: data.trustId,
    initialCapital: trust.initialCapital,
    existingAssets: existingAssets.map((a) => ({
      assetType: a.assetType,
      valueMxn: a.valueMxn,
    })),
    newAsset: {
      assetType: data.assetType,
      valueMxn: new Decimal(data.valueMxn),
    },
    bondLimitPercent: trust.bondLimitPercent.toNumber(),
    otherLimitPercent: trust.otherLimitPercent.toNumber(),
  };

  const investmentResults = validateInvestmentRules(investmentContext);

  // 6. Aplicar reglas específicas si es préstamo hipotecario
  const mortgageResults: any[] = [];
  if (data.assetType === 'MortgageLoan' && data.mortgageData) {
    const mortgageData: MortgageLoanData = {
      price: new Decimal(data.mortgageData.price),
      loanAmount: new Decimal(data.mortgageData.loanAmount),
      termYears: data.mortgageData.termYears,
      monthlyPayment: new Decimal(data.mortgageData.monthlyPayment),
      hasMortgageGuarantee: data.mortgageData.hasMortgageGuarantee,
      hasLifeInsurance: data.mortgageData.hasLifeInsurance,
      hasFireInsurance: data.mortgageData.hasFireInsurance,
      interestRate: new Decimal(data.mortgageData.interestRate),
      areaMinimumWage: new Decimal(data.mortgageData.areaMinimumWage),
      maxBondYieldRate: data.mortgageData.maxBondYieldRate
        ? new Decimal(data.mortgageData.maxBondYieldRate)
        : undefined,
    };

    mortgageResults.push(...validateMortgageLoan(mortgageData));
  }

  // 7. Determinar cumplimiento general
  const allResults = [...investmentResults, ...mortgageResults];
  const isCompliant = allResults.every((r) => r.compliant);
  
  // Determinar el estado de cumplimiento:
  // - Si cumple todo → COMPLIANT
  // - Si solo viola reglas de límites de inversión → PENDING_REVIEW (puede tener excepción)
  // - Si viola reglas de préstamos hipotecarios → NON_COMPLIANT (no puede tener excepción)
  // - Si viola ambas → NON_COMPLIANT (las reglas de préstamos no pueden tener excepción)
  let complianceStatus: ComplianceStatus;
  
  if (isCompliant) {
    complianceStatus = ComplianceStatus.COMPLIANT;
  } else {
    // Verificar si hay violaciones de reglas de préstamos hipotecarios
    const hasMortgageViolations = mortgageResults.some((r) => !r.compliant);
    
    // Verificar si hay violaciones de límites de inversión
    const hasInvestmentLimitViolations = investmentResults.some((r) => !r.compliant);
    
    if (hasMortgageViolations) {
      // Si viola reglas de préstamos hipotecarios, NO puede tener excepción
      complianceStatus = ComplianceStatus.NON_COMPLIANT;
    } else if (hasInvestmentLimitViolations) {
      // Si solo viola límites de inversión, puede ser aprobado como excepción
      complianceStatus = ComplianceStatus.PENDING_REVIEW;
    } else {
      // Por defecto, si no cumple algo pero no identificamos el tipo, marcarlo como NON_COMPLIANT
      complianceStatus = ComplianceStatus.NON_COMPLIANT;
    }
  }

  // 8. Validar beneficiario si se especifica
  if (data.beneficiaryId) {
    const beneficiary = await getActorById(data.beneficiaryId);
    if (beneficiary.role !== ActorRole.BENEFICIARIO) {
      throw new Error(`El actor ${data.beneficiaryId} no es un beneficiario`);
    }
    // Verificar que el beneficiario pertenece al fideicomiso
    const { verifyActorTrustMembership } = await import('./actorTrustService');
    const hasAccess = await verifyActorTrustMembership(
      data.beneficiaryId,
      data.trustId,
      [ActorRole.BENEFICIARIO]
    );
    if (!hasAccess) {
      throw new Error(`El beneficiario no pertenece a este fideicomiso`);
    }
  }

  // 9. Guardar activo en la base de datos
  const asset = await prisma.asset.create({
    data: {
      trustId: data.trustId,
      assetType: data.assetType,
      valueMxn: new Decimal(data.valueMxn),
      description: data.description,
      documentHash: data.documentHash,
      complianceStatus,
      compliant: isCompliant,
      validationResults: {
        investmentRules: investmentResults.map(r => ({
          compliant: r.compliant,
          status: r.status,
          message: r.message,
          details: r.details,
        })),
        mortgageRules: mortgageResults.map(r => ({
          compliant: r.compliant,
          status: r.status,
          message: r.message,
          details: r.details,
        })),
      } as any,
      registeredBy: data.registeredBy,
      beneficiaryId: data.beneficiaryId || null,
    },
  });

  // 10. Generar alertas si no cumple
  const alerts = [];
  if (!isCompliant) {
    const { getTrustActors } = await import('./actorTrustService');
    const { AlertType, AlertSubtype } = await import('./alertGenerationService');
    const alertMessage = `Activo registrado no cumple con las reglas del fideicomiso ${data.trustId}. ${allResults.filter((r) => !r.compliant).map((r) => r.message).join(' ')}`;
    
    // Obtener todos los actores relevantes del fideicomiso
    const fiduciarios = await getTrustActors(data.trustId, ActorRole.FIDUCIARIO);
    const comiteTecnico = await getTrustActors(data.trustId, ActorRole.COMITE_TECNICO);
    
    // Crear alertas para Fiduciarios (siempre, para todos los fiduciarios del fideicomiso)
    for (const membership of fiduciarios) {
      const alert = await prisma.alert.create({
        data: {
          assetId: asset.id,
          actorId: membership.actorId,
          message: alertMessage,
          severity: 'error',
          alertType: AlertType.COMPLIANCE,
          alertSubtype: AlertSubtype.RULE_VIOLATION,
          metadata: {
            validationResults: allResults.filter((r) => !r.compliant).map((r) => ({
              compliant: r.compliant,
              status: r.status,
              message: r.message,
            })),
          },
        },
      });
      alerts.push(alert);
    }
    
    // Crear alertas para Comité Técnico (siempre, para todos los miembros del comité)
    for (const membership of comiteTecnico) {
      const alert = await prisma.alert.create({
        data: {
          assetId: asset.id,
          actorId: membership.actorId,
          message: alertMessage,
          severity: 'warning',
          alertType: AlertType.COMPLIANCE,
          alertSubtype: AlertSubtype.RULE_VIOLATION,
          metadata: {
            validationResults: allResults.filter((r) => !r.compliant).map((r) => ({
              compliant: r.compliant,
              status: r.status,
              message: r.message,
            })),
          },
        },
      });
      alerts.push(alert);
    }
    
    // Crear alertas para Beneficiarios
    // IMPORTANTE: Solo crear alerta para el beneficiario específico asociado al activo
    // Si el activo tiene un beneficiaryId, solo ese beneficiario recibe la alerta
    // Si el activo NO tiene beneficiaryId (es un activo general), NO crear alertas para beneficiarios
    if (data.beneficiaryId) {
      // Verificar que el beneficiario existe y pertenece al fideicomiso
      const beneficiarioMembership = await getTrustActors(data.trustId, ActorRole.BENEFICIARIO);
      const beneficiarioAsociado = beneficiarioMembership.find(m => m.actorId === data.beneficiaryId);
      
      if (beneficiarioAsociado) {
        const alert = await prisma.alert.create({
          data: {
            assetId: asset.id,
            actorId: data.beneficiaryId,
            message: `Se ha registrado un activo asociado a tu cuenta que no cumple con las reglas del fideicomiso ${data.trustId}. ${allResults.filter((r) => !r.compliant).map((r) => r.message).join(' ')}`,
            severity: 'warning',
            alertType: AlertType.COMPLIANCE,
            alertSubtype: AlertSubtype.RULE_VIOLATION,
            metadata: {
              validationResults: allResults.filter((r) => !r.compliant).map((r) => ({
                compliant: r.compliant,
                status: r.status,
                message: r.message,
              })),
            },
          },
        });
        alerts.push(alert);
      } else {
        console.warn(`⚠️  Beneficiario ${data.beneficiaryId} no encontrado en el fideicomiso ${data.trustId}`);
      }
    }
    // Si no hay beneficiaryId, no crear alertas para beneficiarios (es un activo general del fideicomiso)
  }

  // 10. Generar VC y anclar en blockchain
  let updatedAsset = asset;
  try {
    const { issueAssetVC, hashVC } = await import('./vcIssuer');
    const { anchorVC } = await import('./blockchainService');
    
    // Cargar actor completo para el VC
    const registeredByActor = await getActorById(data.registeredBy);
    
    // Generar Verifiable Credential
    const vc = await issueAssetVC(
      { ...asset, actor: registeredByActor },
      trust
    );
    
    // Generar hash del VC
    const vcHash = hashVC(vc);
    
    // Anclar hash en blockchain
    const anchorResult = await anchorVC(vcHash, {
      assetId: asset.id,
      trustId: asset.trustId,
      vcHash,
      timestamp: new Date().toISOString(),
    });
    
    // Actualizar activo con información blockchain
    if (anchorResult.success) {
      updatedAsset = await prisma.asset.update({
        where: { id: asset.id },
        data: {
          vcHash,
          blockchainTxHash: anchorResult.txHash || anchorResult.ipfsHash || null,
          blockchainNetwork: anchorResult.network || null,
          anchoredAt: new Date(),
        },
      });
    }
  } catch (error: any) {
    // No fallar el registro si el anclaje falla, solo loguear
    console.error('⚠️  Error generando VC o anclando en blockchain:', error);
  }

  // Registrar log de auditoría (no bloquea la operación si falla)
  try {
    await createAuditLog({
      actorId: data.registeredBy,
      action: AuditAction.ASSET_REGISTERED,
      entityType: EntityType.ASSET,
      entityId: updatedAsset.id,
      trustId: data.trustId,
      description: `Activo ${data.assetType} registrado con valor de $${new Decimal(data.valueMxn).toFixed(2)} MXN. Estado: ${complianceStatus}`,
      metadata: {
        assetType: data.assetType,
        valueMxn: data.valueMxn.toString(),
        compliant: isCompliant,
        complianceStatus,
        beneficiaryId: data.beneficiaryId || null,
      },
      ipAddress: data.requestInfo?.ipAddress,
      userAgent: data.requestInfo?.userAgent,
    });
  } catch (error) {
    // No fallar la operación principal si el logging falla
    console.error('⚠️  Error registrando log de auditoría:', error);
  }

  return {
    asset: updatedAsset,
    compliant: isCompliant,
    complianceStatus,
    validationResults: allResults,
    alerts,
  };
}

/**
 * Lista activos de un fideicomiso con filtros opcionales
 * 
 * LÓGICA DE VISIBILIDAD POR ROL:
 * - BENEFICIARIO: Solo ve activos donde beneficiaryId = su ID
 * - FIDUCIARIO, COMITE_TECNICO, AUDITOR, REGULADOR: Ven todos los activos del fideicomiso
 * - SUPER_ADMIN: Ve todos los activos (sin restricciones de fideicomiso)
 * 
 * @param filters - Filtros para la consulta
 * @param filters.trustId - ID del fideicomiso (requerido)
 * @param filters.actorRole - Rol del usuario que hace la consulta (para aplicar filtros automáticos)
 * @param filters.actorId - ID del usuario que hace la consulta (para aplicar filtros automáticos)
 * @param filters.beneficiaryId - Filtrar por beneficiario específico (opcional, sobrescribe filtro automático)
 */
export async function getAssets(filters: {
  trustId: string;
  assetType?: AssetType;
  complianceStatus?: ComplianceStatus;
  limit?: number;
  offset?: number;
  beneficiaryId?: string; // Filtrar por beneficiario específico (opcional)
  actorRole?: ActorRole;  // Rol del actor que hace la consulta
  actorId?: string;       // ID del actor que hace la consulta
}) {
  const where: any = {
    trustId: filters.trustId,
  };

  if (filters.assetType) {
    where.assetType = filters.assetType;
  }

  if (filters.complianceStatus) {
    where.complianceStatus = filters.complianceStatus;
  }

  // FILTRADO POR ROL:
  // Si es un beneficiario, solo mostrar activos asociados a él
  // Los demás roles ven todos los activos del fideicomiso
  if (filters.actorRole === ActorRole.BENEFICIARIO && filters.actorId) {
    // Para beneficiarios, aplicar filtro automático: solo sus activos
    where.beneficiaryId = filters.actorId;
  } else if (filters.beneficiaryId) {
    // Si se especifica un beneficiaryId explícito (y no es beneficiario), usarlo
    // Esto permite que otros roles filtren por beneficiario específico si lo desean
    where.beneficiaryId = filters.beneficiaryId;
  }
  // Si no es beneficiario y no se especifica beneficiaryId, ver todos los activos del fideicomiso

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
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
      orderBy: { registeredAt: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    }),
    prisma.asset.count({ where }),
  ]);

  return {
    assets,
    total,
    limit: filters.limit || 100,
    offset: filters.offset || 0,
  };
}

/**
 * Obtiene un activo específico por ID
 * 
 * VALIDACIÓN DE ACCESO POR ROL:
 * - BENEFICIARIO: Solo puede ver activos donde beneficiaryId = su ID
 * - Otros roles: Pueden ver cualquier activo del fideicomiso donde pertenecen
 * 
 * @param assetId - ID del activo a consultar
 * @param actorId - ID del usuario que hace la consulta (opcional, para validación)
 * @param actorRole - Rol del usuario que hace la consulta (opcional, para validación)
 * @throws Error si el activo no existe o si el beneficiario no tiene acceso
 */
export async function getAssetById(assetId: string, actorId?: string, actorRole?: ActorRole) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
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
      alerts: true,
    },
  });

  if (!asset) {
    throw new Error(`Activo ${assetId} no encontrado`);
  }

  // VALIDACIÓN DE ACCESO PARA BENEFICIARIOS:
  // Si es un beneficiario consultando, verificar que el activo esté asociado a él
  if (actorRole === ActorRole.BENEFICIARIO && actorId) {
    if (asset.beneficiaryId !== actorId) {
      throw new Error('No tienes acceso a este activo. Solo puedes ver activos asociados a tu cuenta.');
    }
  }

  return asset;
}

/**
 * Aprueba una excepción para un activo pendiente de revisión
 * Solo el Comité Técnico puede aprobar excepciones
 * 
 * @param assetId - ID del activo a aprobar
 * @param approvedBy - ID del miembro del Comité Técnico que aprueba
 * @param reason - Razón de la aprobación (opcional)
 * @throws Error si el activo no existe, no está en PENDING_REVIEW, o el usuario no tiene permisos
 */
export async function approveException(
  assetId: string,
  approvedBy: string,
  reason?: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<{ asset: any; alert: any }> {
  // 1. Verificar que el activo existe
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

  // 2. Verificar que el activo está en estado PENDING_REVIEW
  if (asset.complianceStatus !== ComplianceStatus.PENDING_REVIEW) {
    throw new Error(`El activo no está pendiente de revisión. Estado actual: ${asset.complianceStatus}`);
  }

  // 3. Verificar que el usuario es COMITE_TECNICO
  const actor = await getActorById(approvedBy);
  if (actor.role !== ActorRole.COMITE_TECNICO && !actor.isSuperAdmin) {
    throw new Error('Solo el Comité Técnico puede aprobar excepciones');
  }

  // 4. Verificar que el usuario pertenece al fideicomiso
  if (!actor.isSuperAdmin) {
    const { verifyActorTrustMembership } = await import('./actorTrustService');
    const hasAccess = await verifyActorTrustMembership(
      approvedBy,
      asset.trustId,
      [ActorRole.COMITE_TECNICO]
    );
    
    if (!hasAccess) {
      throw new Error('No tienes acceso a este fideicomiso o no eres miembro del Comité Técnico');
    }
  }

  // 5. Verificar si el fideicomiso requiere consenso
  const trust = await prisma.trust.findUnique({
    where: { trustId: asset.trustId },
  });

  if (trust?.requiresConsensus) {
    // Si requiere consenso, usar el sistema de votaciones
    const { voteException } = await import('./exceptionVoteService');
    const voteResult = await voteException({
      assetId,
      voterId: approvedBy,
      vote: 'APPROVE',
      reason,
      requestInfo,
    });
    
    // Obtener el activo actualizado después de la votación
    const updatedAsset = await prisma.asset.findUnique({
      where: { id: assetId },
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

    return {
      asset: updatedAsset,
      alert: null, // Las alertas se manejan en voteException
      voteResult,
    };
  }

  // 5. Actualizar el activo a EXCEPTION_APPROVED
  const updatedAsset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      complianceStatus: ComplianceStatus.EXCEPTION_APPROVED,
      compliant: true, // Las excepciones aprobadas se consideran cumplientes
      validationResults: {
        ...(asset.validationResults as any || {}),
        exceptionApproval: {
          approvedBy: actor.id,
          approvedByName: actor.name,
          approvedAt: new Date().toISOString(),
          reason: reason || 'Excepción aprobada por Comité Técnico',
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

  // 6. Crear alertas para informar a los stakeholders
  const { getTrustActors } = await import('./actorTrustService');
  const fiduciarios = await getTrustActors(asset.trustId, ActorRole.FIDUCIARIO);
  
  const approvalMessage = `Excepción aprobada para activo ${assetId} por el Comité Técnico. ${reason || 'Aprobado según criterio del Comité.'}`;
  
  // Crear alerta para el Fiduciario que registró el activo
  let alert = null;
  if (asset.registeredBy) {
    alert = await prisma.alert.create({
      data: {
        assetId: asset.id,
        actorId: asset.registeredBy,
        message: approvalMessage,
        severity: 'info',
      },
    });
  }

  // Crear alertas para todos los fiduciarios del fideicomiso
  for (const membership of fiduciarios) {
    if (membership.actorId !== asset.registeredBy) {
      await prisma.alert.create({
        data: {
          assetId: asset.id,
          actorId: membership.actorId,
          message: approvalMessage,
          severity: 'info',
          alertType: AlertType.COMPLIANCE,
          alertSubtype: AlertSubtype.EXCEPTION_PENDING, // Cambiar a un subtipo de aprobación si lo agregamos
          metadata: {
            approvedBy: actor.id,
            approvedByName: actor.name,
            reason: reason || 'Aprobado según criterio del Comité',
          },
        },
      });
    }
  }

  // Si hay beneficiario asociado, crear alerta para él también
  if (asset.beneficiaryId) {
    await prisma.alert.create({
      data: {
        assetId: asset.id,
        actorId: asset.beneficiaryId,
        message: `El activo asociado a tu cuenta ha sido aprobado como excepción por el Comité Técnico.`,
        severity: 'info',
        alertType: AlertType.COMPLIANCE,
        alertSubtype: AlertSubtype.EXCEPTION_PENDING, // Cambiar a un subtipo de aprobación si lo agregamos
        metadata: {
          approvedBy: actor.id,
          approvedByName: actor.name,
        },
      },
    });
  }

  // Registrar log de auditoría
  try {
    await createAuditLog({
      actorId: approvedBy,
      action: AuditAction.EXCEPTION_APPROVED,
      entityType: EntityType.ASSET,
      entityId: assetId,
      trustId: asset.trustId,
      description: `Excepción aprobada para activo ${assetId} por Comité Técnico. ${reason || 'Aprobado según criterio del Comité.'}`,
      metadata: {
        assetType: asset.assetType,
        valueMxn: asset.valueMxn.toString(),
        reason: reason || null,
        approvedBy: actor.id,
        approvedByName: actor.name,
      },
    });
  } catch (error) {
    console.error('⚠️  Error registrando log de auditoría:', error);
  }

  return {
    asset: updatedAsset,
    alert: alert || null,
  };
}

/**
 * Rechaza una excepción para un activo pendiente de revisión
 * Solo el Comité Técnico puede rechazar excepciones
 * 
 * @param assetId - ID del activo a rechazar
 * @param rejectedBy - ID del miembro del Comité Técnico que rechaza
 * @param reason - Razón del rechazo (opcional)
 * @throws Error si el activo no existe, no está en PENDING_REVIEW, o el usuario no tiene permisos
 */
export async function rejectException(
  assetId: string,
  rejectedBy: string,
  reason?: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<{ asset: any; alert: any }> {
  // 1. Verificar que el activo existe
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

  // 2. Verificar que el activo está en estado PENDING_REVIEW
  if (asset.complianceStatus !== ComplianceStatus.PENDING_REVIEW) {
    throw new Error(`El activo no está pendiente de revisión. Estado actual: ${asset.complianceStatus}`);
  }

  // 3. Verificar que el usuario es COMITE_TECNICO
  const actor = await getActorById(rejectedBy);
  if (actor.role !== ActorRole.COMITE_TECNICO && !actor.isSuperAdmin) {
    throw new Error('Solo el Comité Técnico puede rechazar excepciones');
  }

  // 4. Verificar que el usuario pertenece al fideicomiso
  if (!actor.isSuperAdmin) {
    const { verifyActorTrustMembership } = await import('./actorTrustService');
    const hasAccess = await verifyActorTrustMembership(
      rejectedBy,
      asset.trustId,
      [ActorRole.COMITE_TECNICO]
    );
    
    if (!hasAccess) {
      throw new Error('No tienes acceso a este fideicomiso o no eres miembro del Comité Técnico');
    }
  }

  // 5. Verificar si el fideicomiso requiere consenso
  const trust = await prisma.trust.findUnique({
    where: { trustId: asset.trustId },
  });

  if (trust?.requiresConsensus) {
    // Si requiere consenso, usar el sistema de votaciones
    const { voteException } = await import('./exceptionVoteService');
    const voteResult = await voteException({
      assetId,
      voterId: rejectedBy,
      vote: 'REJECT',
      reason,
      requestInfo,
    });
    
    // Obtener el activo actualizado después de la votación
    const updatedAsset = await prisma.asset.findUnique({
      where: { id: assetId },
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

    return {
      asset: updatedAsset,
      voteResult,
    };
  }

  // 6. Si no requiere consenso, proceder con rechazo directo
  // Actualizar el activo a NON_COMPLIANT
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
          reason: reason || 'Excepción rechazada por Comité Técnico',
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

  // 6. Crear alertas para informar a los stakeholders
  const { getTrustActors } = await import('./actorTrustService');
  const fiduciarios = await getTrustActors(asset.trustId, ActorRole.FIDUCIARIO);
  
  const rejectionMessage = `Excepción rechazada para activo ${assetId} por el Comité Técnico. ${reason || 'No cumple con los criterios establecidos.'}`;
  
  // Crear alerta para el Fiduciario que registró el activo
  let alert = null;
  if (asset.registeredBy) {
    alert = await prisma.alert.create({
      data: {
        assetId: asset.id,
        actorId: asset.registeredBy,
        message: rejectionMessage,
        severity: 'error',
        alertType: AlertType.COMPLIANCE,
        alertSubtype: AlertSubtype.RULE_VIOLATION,
        metadata: {
          rejectedBy: actor.id,
          rejectedByName: actor.name,
          reason: reason || 'No cumple con los criterios establecidos',
        },
      },
    });
  }

  // Crear alertas para todos los fiduciarios del fideicomiso
  for (const membership of fiduciarios) {
    if (membership.actorId !== asset.registeredBy) {
      await prisma.alert.create({
        data: {
          assetId: asset.id,
          actorId: membership.actorId,
          message: rejectionMessage,
          severity: 'error',
          alertType: AlertType.COMPLIANCE,
          alertSubtype: AlertSubtype.RULE_VIOLATION,
          metadata: {
            rejectedBy: actor.id,
            rejectedByName: actor.name,
            reason: reason || 'No cumple con los criterios establecidos',
          },
        },
      });
    }
  }

  // Si hay beneficiario asociado, crear alerta para él también
  if (asset.beneficiaryId) {
    await prisma.alert.create({
      data: {
        assetId: asset.id,
        actorId: asset.beneficiaryId,
        message: `El activo asociado a tu cuenta ha sido rechazado por el Comité Técnico. ${reason || 'No cumple con los criterios establecidos.'}`,
        severity: 'error',
        alertType: AlertType.COMPLIANCE,
        alertSubtype: AlertSubtype.RULE_VIOLATION,
        metadata: {
          rejectedBy: actor.id,
          rejectedByName: actor.name,
          reason: reason || 'No cumple con los criterios establecidos',
        },
      },
    });
  }

  // Registrar log de auditoría
  try {
    await createAuditLog({
      actorId: rejectedBy,
      action: AuditAction.EXCEPTION_REJECTED,
      entityType: EntityType.ASSET,
      entityId: assetId,
      trustId: asset.trustId,
      description: `Excepción rechazada para activo ${assetId} por Comité Técnico. ${reason || 'No cumple con los criterios establecidos.'}`,
      metadata: {
        assetType: asset.assetType,
        valueMxn: asset.valueMxn.toString(),
        reason: reason || null,
        rejectedBy: actor.id,
        rejectedByName: actor.name,
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });
  } catch (error) {
    console.error('⚠️  Error registrando log de auditoría:', error);
  }

  return {
    asset: updatedAsset,
    alert: alert || null,
  };
}
