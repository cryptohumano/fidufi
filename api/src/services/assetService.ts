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
  const complianceStatus: ComplianceStatus = isCompliant
    ? ComplianceStatus.COMPLIANT
    : ComplianceStatus.NON_COMPLIANT;

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
