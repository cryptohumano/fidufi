/**
 * Routes para gestión de fideicomisos
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getTrust, getTrustSummary, updateTrustLimits, updateTrustStatus, createTrust, getAllTrusts, getTrustTypes, getTrustTypeById, calculateTrustTimeline, getTrustParties } from '../services/trustService';
import { getComplianceAnalytics } from '../services/complianceAnalyticsService';
import { getOrganizationStructure, getOrganizationSummary } from '../services/organizationService';
import { authenticate, authorize, optionalAuthenticate, requireSuperAdmin } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';
import { createAuditLog, AuditAction, EntityType, extractRequestInfo } from '../services/auditLogService';

const router = Router();

/**
 * GET /trusts/types
 * Lista tipos de fideicomiso (plantillas) con reglas para onboarding
 * Debe ir antes de /:trustId para no capturar "types" como trustId
 */
router.get('/types', authenticate, async (_req, res) => {
  try {
    const types = await getTrustTypes();
    res.json(types);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /trusts
 * Lista todos los fideicomisos activos
 * Solo SUPER_ADMIN puede ver todos, otros roles ven solo los fideicomisos a los que pertenecen
 */
router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const isSuperAdmin = req.user.actor?.isSuperAdmin || req.user.actor?.role === ActorRole.SUPER_ADMIN;
    
    if (isSuperAdmin) {
      // SUPER_ADMIN ve todos (activos e inactivos) para poder reactivar los dados de baja
      const trusts = await getAllTrusts({ includeInactive: true });
      res.json(trusts);
    } else {
      // Otros roles ven solo los fideicomisos a los que pertenecen
      const { getActorTrusts } = await import('../services/actorTrustService');
      const memberships = await getActorTrusts(req.user.actorId);
      const trustIds = memberships.map((m: any) => m.trustId);
      
      const trusts = await prisma.trust.findMany({
        where: {
          trustId: { in: trustIds },
          active: true,
        },
        include: {
          trustTypeRef: true,
        },
        orderBy: { trustId: 'asc' },
      });
      
      res.json(trusts);
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /trusts
 * Crea un nuevo fideicomiso (solo SUPER_ADMIN)
 */
router.post('/', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log('📥 Recibiendo petición para crear fideicomiso:', {
      body: req.body,
      user: (req.user as any)?.email ?? req.user?.actor?.id,
    });

    const {
      trustId,
      name,
      initialCapital,
      bondLimitPercent,
      otherLimitPercent,
      trustTypeId,
      trustTypeConfig,
      fideicomitenteName,
      fideicomitenteRFC,
      fiduciarioName,
      fiduciarioRFC,
      constitutionDate,
      maxTermYears,
      termType,
      rfc,
      satRegistrationNumber,
      satRegisteredAt,
      reportPeriodicity,
      fiscalYearEndMonth,
      fiscalYearEndDay,
      observationDays,
      fechaFirma,
      lugarFirma,
      jurisdiccion,
      domicilioLegal,
      domicilioFiscal,
      baseCurrency,
      fechaCierreEjercicioDay,
      fechaCierreEjercicioMonth,
      fechaObjetivoEntrega,
      reglasExtincionResumen,
      objetoTexto,
      finalidadCategoria,
      anexosObligatorios,
      moraAutomatica,
      diasGracia,
      permisosPortal,
      tags,
      notasInternas,
    } = req.body;

    const initialCapitalNum = initialCapital != null
      ? (typeof initialCapital === 'number' ? initialCapital : parseFloat(String(initialCapital)))
      : 0;

    const normalizedTrustTypeId =
      trustTypeId != null && String(trustTypeId).trim() !== '' ? String(trustTypeId).trim() : null;
    if (!normalizedTrustTypeId) {
      return res.status(400).json({ error: 'trustTypeId es requerido. Seleccione el tipo de fideicomiso (Construcción, Financiero o Administrativo).' });
    }
    const normalizedBaseCurrency =
      baseCurrency != null && String(baseCurrency).trim() !== '' ? String(baseCurrency).trim() : 'ARS';

    const trust = await createTrust({
      trustId: trustId || undefined,
      name,
      initialCapital: initialCapitalNum,
      bondLimitPercent: bondLimitPercent != null ? parseFloat(String(bondLimitPercent)) : undefined,
      otherLimitPercent: otherLimitPercent != null ? parseFloat(String(otherLimitPercent)) : undefined,
      trustTypeId: normalizedTrustTypeId,
      trustTypeConfig: trustTypeConfig && typeof trustTypeConfig === 'object' ? trustTypeConfig : undefined,
      fideicomitenteName,
      fideicomitenteRFC,
      fiduciarioName,
      fiduciarioRFC,
      constitutionDate: constitutionDate ? new Date(constitutionDate) : undefined,
      maxTermYears: maxTermYears != null ? parseInt(String(maxTermYears), 10) : undefined,
      termType: termType as 'STANDARD' | 'FOREIGN' | 'DISABILITY' | undefined,
      requiresConsensus: req.body.requiresConsensus ?? false,
      rfc,
      satRegistrationNumber,
      satRegisteredAt: satRegisteredAt ? new Date(satRegisteredAt) : undefined,
      reportPeriodicity,
      fiscalYearEndMonth: fiscalYearEndMonth != null ? parseInt(String(fiscalYearEndMonth), 10) : undefined,
      fiscalYearEndDay: fiscalYearEndDay != null ? parseInt(String(fiscalYearEndDay), 10) : undefined,
      observationDays: observationDays != null ? parseInt(String(observationDays), 10) : undefined,
      fechaFirma: fechaFirma ? new Date(fechaFirma) : undefined,
      lugarFirma,
      jurisdiccion,
      domicilioLegal,
      domicilioFiscal,
      baseCurrency: normalizedBaseCurrency,
      fechaCierreEjercicioDay: fechaCierreEjercicioDay != null ? parseInt(String(fechaCierreEjercicioDay), 10) : undefined,
      fechaCierreEjercicioMonth: fechaCierreEjercicioMonth != null ? parseInt(String(fechaCierreEjercicioMonth), 10) : undefined,
      fechaObjetivoEntrega: fechaObjetivoEntrega ? new Date(fechaObjetivoEntrega) : undefined,
      reglasExtincionResumen,
      objetoTexto,
      finalidadCategoria,
      anexosObligatorios: Array.isArray(anexosObligatorios) ? anexosObligatorios : undefined,
      moraAutomatica,
      diasGracia: diasGracia != null ? parseInt(String(diasGracia), 10) : undefined,
      permisosPortal: permisosPortal && typeof permisosPortal === 'object' ? permisosPortal : undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      notasInternas,
    });

    const requestInfo = extractRequestInfo(req);
    try {
      const trustType = await getTrustTypeById(trust.trustTypeId ?? null);
      let typeCode = trustType?.code ?? null;
      const rawConfig = trust.trustTypeConfig && typeof trust.trustTypeConfig === 'object' ? (trust.trustTypeConfig as Record<string, unknown>) : {};
      const hasPresupuesto = rawConfig && 'presupuestoTotal' in rawConfig && Number(rawConfig.presupuestoTotal) > 0;
      if (!typeCode && hasPresupuesto) typeCode = 'CONSTRUCCION';

      const basePayload: Record<string, unknown> = {
        trustId: trust.trustId,
        name: name ?? trust.name ?? null,
        trustTypeId: trust.trustTypeId ?? null,
        trustTypeCode: typeCode,
        baseCurrency: trust.baseCurrency ?? 'ARS',
      };
      if (typeCode === 'CONSTRUCCION') {
        basePayload.trustTypeConfig = rawConfig;
      } else if (typeCode === 'FINANCIERO') {
        basePayload.initialCapital = Number(trust.initialCapital);
        basePayload.bondLimitPercent = Number(trust.bondLimitPercent);
        basePayload.otherLimitPercent = Number(trust.otherLimitPercent);
      } else {
        basePayload.initialCapital = Number(trust.initialCapital);
        if (trust.bondLimitPercent != null) basePayload.bondLimitPercent = Number(trust.bondLimitPercent);
        if (trust.otherLimitPercent != null) basePayload.otherLimitPercent = Number(trust.otherLimitPercent);
      }
      await createAuditLog({
        actorId: req.user.actorId,
        action: AuditAction.TRUST_CREATED,
        entityType: EntityType.TRUST,
        entityId: trust.id,
        trustId: trust.trustId,
        description: `Fideicomiso ${trust.trustId} creado${trustType?.name ? ` (tipo: ${trustType.name})` : ''}`,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        metadata: basePayload,
      });
    } catch (error) {
      console.error('⚠️  Error registrando log de auditoría:', error);
    }

    // Asegurar que la respuesta incluya trustTypeRef para que el frontend muestre tipo y moneda
    let responseTrust: any = trust;
    if (!(trust as any).trustTypeRef && trust.trustTypeId) {
      const typeRow = await getTrustTypeById(trust.trustTypeId);
      if (typeRow) responseTrust = { ...trust, trustTypeRef: typeRow };
    }
    res.status(201).json(responseTrust);
  } catch (error: any) {
    console.error('❌ Error en ruta POST /trusts:', error);
    res.status(400).json({ error: error.message || 'Error al procesar la solicitud' });
  }
});

/**
 * PATCH /trusts/:trustId
 * Actualiza estado: activo/inactivo (baja) y/o status (DRAFT, ACTIVO, CERRADO). Solo SUPER_ADMIN.
 * Debe ir antes de las rutas GET /:trustId para que Express la empareje correctamente.
 */
router.patch('/:trustId', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const { trustId } = req.params;
    const { active, status } = req.body;
    const trust = await updateTrustStatus(trustId, { active, status });
    res.json(trust);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /trusts/:trustId/organization/summary
 * Obtiene un resumen simple de la organización (solo conteos)
 * IMPORTANTE: Esta ruta debe ir ANTES de /:trustId/organization
 */
router.get('/:trustId/organization/summary', optionalAuthenticate, async (req, res) => {
  try {
    const { trustId } = req.params;
    
    // Verificar que no sea beneficiario
    if (req.user?.role === ActorRole.BENEFICIARIO) {
      return res.status(403).json({ error: 'Los beneficiarios no pueden ver la estructura organizacional' });
    }
    
    const summary = await getOrganizationSummary(trustId);
    res.json(summary);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /trusts/:trustId/organization
 * Obtiene la estructura organizacional del fideicomiso con diagrama Mermaid
 * Accesible para todos los roles excepto BENEFICIARIO
 * IMPORTANTE: Esta ruta debe ir ANTES de /:trustId
 */
router.get('/:trustId/organization', optionalAuthenticate, async (req, res) => {
  try {
    const { trustId } = req.params;
    
    // Verificar que no sea beneficiario (solo lectura para ellos)
    if (req.user?.role === ActorRole.BENEFICIARIO) {
      return res.status(403).json({ error: 'Los beneficiarios no pueden ver la estructura organizacional' });
    }
    
    const structure = await getOrganizationStructure(trustId);
    
    // Serializar fechas para JSON
    res.json({
      ...structure,
      members: {
        fiduciarios: structure.members.fiduciarios.map(m => ({
          ...m,
          assignedAt: m.assignedAt.toISOString(),
        })),
        comiteTecnico: structure.members.comiteTecnico.map(m => ({
          ...m,
          assignedAt: m.assignedAt.toISOString(),
        })),
        auditores: structure.members.auditores.map(m => ({
          ...m,
          assignedAt: m.assignedAt.toISOString(),
        })),
        reguladores: structure.members.reguladores.map(m => ({
          ...m,
          assignedAt: m.assignedAt.toISOString(),
        })),
        beneficiarios: structure.members.beneficiarios.map(m => ({
          ...m,
          assignedAt: m.assignedAt.toISOString(),
        })),
      },
    });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /trusts/:trustId/summary
 * Obtiene resumen del fideicomiso con estadísticas
 */
router.get('/:trustId/summary', async (req, res) => {
  try {
    const { trustId } = req.params;
    const summary = await getTrustSummary(trustId);
    
    // Serializar Decimal a string para JSON y agregar alias para compatibilidad
    const totalInvestedStr = summary.totalInvested.toString();
    const bondInvestmentStr = summary.bondInvestment.toString();
    const otherInvestmentStr = summary.otherInvestment.toString();
    
    res.json({
      ...summary,
      // Valores originales (Decimal serializados)
      totalInvested: totalInvestedStr,
      bondInvestment: bondInvestmentStr,
      otherInvestment: otherInvestmentStr,
      initialCapital: summary.initialCapital.toString(),
      bondLimitPercent: summary.bondLimitPercent != null ? summary.bondLimitPercent.toString() : null,
      otherLimitPercent: summary.otherLimitPercent != null ? summary.otherLimitPercent.toString() : null,
      // Alias para compatibilidad con frontend
      totalValue: totalInvestedStr,
      bondPercentage: summary.bondPercent,
      otherPercentage: summary.otherPercent,
    });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /trusts/:trustId/analytics
 * Obtiene analytics avanzados de cumplimiento para el fideicomiso
 * Incluye métricas de cumplimiento, distribución de activos, espacio disponible, etc.
 */
router.get('/:trustId/analytics', async (req, res) => {
  try {
    const { trustId } = req.params;
    const analytics = await getComplianceAnalytics(trustId);
    
    // Serializar Decimal a string para JSON
    res.json({
      ...analytics,
      bondLimit: {
        ...analytics.bondLimit,
        current: analytics.bondLimit.current.toString(),
        limit: analytics.bondLimit.limit.toString(),
        availableSpace: analytics.bondLimit.availableSpace.toString(),
      },
      otherLimit: {
        ...analytics.otherLimit,
        current: analytics.otherLimit.current.toString(),
        limit: analytics.otherLimit.limit.toString(),
        availableSpace: analytics.otherLimit.availableSpace.toString(),
      },
      assetDistribution: {
        ...analytics.assetDistribution,
        byCompliance: {
          compliant: {
            ...analytics.assetDistribution.byCompliance.compliant,
            totalValue: analytics.assetDistribution.byCompliance.compliant.totalValue.toString(),
          },
          nonCompliant: {
            ...analytics.assetDistribution.byCompliance.nonCompliant,
            totalValue: analytics.assetDistribution.byCompliance.nonCompliant.totalValue.toString(),
          },
        },
        byType: Object.fromEntries(
          Object.entries(analytics.assetDistribution.byType).map(([key, value]: [string, any]) => [
            key,
            {
              ...value,
              totalValue: value.totalValue.toString(),
            },
          ])
        ),
      },
      patrimony: {
        ...analytics.patrimony,
        initial: analytics.patrimony.initial.toString(),
        current: analytics.patrimony.current.toString(),
        growthAmount: analytics.patrimony.growthAmount.toString(),
      },
    });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /trusts/:trustId/timeline
 * Obtiene información del timeline del fideicomiso (plazos, fechas, tiempo restante)
 */
router.get('/:trustId/timeline', async (req, res) => {
  try {
    const { trustId } = req.params;
    const trust = await getTrust(trustId);
    const timeline = calculateTrustTimeline({
      constitutionDate: trust.constitutionDate,
      expirationDate: trust.expirationDate,
      maxTermYears: trust.maxTermYears,
      termType: trust.termType,
    });
    res.json(timeline);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /trusts/:trustId/parties
 * Obtiene información de las partes involucradas en el fideicomiso
 */
router.get('/:trustId/parties', async (req, res) => {
  try {
    const { trustId } = req.params;
    const parties = await getTrustParties(trustId);
    
    // Serializar fechas para JSON
    const toParty = (m: { assignedAt?: Date; [k: string]: unknown }) => ({
      ...m,
      assignedAt: m.assignedAt instanceof Date ? m.assignedAt.toISOString() : (m as any).assignedAt,
    });
    res.json({
      ...parties,
      comiteTecnico: parties.comiteTecnico.map(toParty),
      beneficiarios: parties.beneficiarios.map(toParty),
      auditores: parties.auditores.map(toParty),
      reguladores: parties.reguladores.map(toParty),
    });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /trusts/:trustId
 * Obtiene información de un fideicomiso
 * IMPORTANTE: Esta ruta debe ir AL FINAL porque es la más genérica
 */
router.get('/:trustId', async (req, res) => {
  try {
    const { trustId } = req.params;
    const trust = await getTrust(trustId);
    res.json(trust);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * PUT /trusts/:trustId/limits
 * Actualiza límites de inversión (solo Comité Técnico)
 */
router.put('/:trustId/limits', authenticate, authorize(ActorRole.COMITE_TECNICO), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const { trustId } = req.params;
    const { bondLimitPercent, otherLimitPercent } = req.body;

    const trust = await updateTrustLimits(trustId, bondLimitPercent, otherLimitPercent);
    res.json(trust);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
