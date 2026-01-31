/**
 * Routes para gestión de fideicomisos
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getTrust, getTrustSummary, updateTrustLimits, createTrust, getAllTrusts, calculateTrustTimeline, getTrustParties } from '../services/trustService';
import { getComplianceAnalytics } from '../services/complianceAnalyticsService';
import { getOrganizationStructure, getOrganizationSummary } from '../services/organizationService';
import { authenticate, authorize, optionalAuthenticate, requireSuperAdmin } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';
import { createAuditLog, AuditAction, EntityType, extractRequestInfo } from '../services/auditLogService';

const router = Router();

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
      // SUPER_ADMIN ve todos los fideicomisos
      const trusts = await getAllTrusts();
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
        select: {
          id: true,
          trustId: true,
          name: true,
          initialCapital: true,
          bondLimitPercent: true,
          otherLimitPercent: true,
          active: true,
          createdAt: true,
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
      user: req.user.email,
    });

    const { 
      trustId, // Opcional: se genera automáticamente si no se proporciona
      name, 
      initialCapital, 
      bondLimitPercent, 
      otherLimitPercent,
      // Información de partes
      fideicomitenteName,
      fideicomitenteRFC,
      fiduciarioName,
      fiduciarioRFC,
      // Plazos y vigencia
      constitutionDate,
      maxTermYears,
      termType,
      // Obligaciones fiscales
      rfc,
      satRegistrationNumber,
      satRegisteredAt,
    } = req.body;

    if (!initialCapital) {
      console.error('❌ initialCapital no proporcionado');
      return res.status(400).json({ error: 'initialCapital es requerido' });
    }

    // Validar que initialCapital sea un número válido
    const initialCapitalNum = typeof initialCapital === 'number' 
      ? initialCapital 
      : parseFloat(String(initialCapital));
    
    console.log('🔍 Validando initialCapital:', {
      original: initialCapital,
      parsed: initialCapitalNum,
      isNaN: isNaN(initialCapitalNum),
      type: typeof initialCapital,
    });

    if (isNaN(initialCapitalNum) || initialCapitalNum <= 0) {
      console.error('❌ initialCapital inválido:', initialCapitalNum);
      return res.status(400).json({ error: 'initialCapital debe ser un número mayor a cero' });
    }

    console.log('🚀 Creando fideicomiso con datos:', {
      trustId: trustId || '(se generará automáticamente)',
      name,
      initialCapital: initialCapitalNum,
      bondLimitPercent,
      otherLimitPercent,
    });

    const trust = await createTrust({
      trustId: trustId || undefined, // Se genera automáticamente si no se proporciona
      name,
      initialCapital: initialCapitalNum,
      bondLimitPercent: bondLimitPercent ? parseFloat(String(bondLimitPercent)) : undefined,
      otherLimitPercent: otherLimitPercent ? parseFloat(String(otherLimitPercent)) : undefined,
      // Información de partes
      fideicomitenteName,
      fideicomitenteRFC,
      fiduciarioName,
      fiduciarioRFC,
      // Plazos y vigencia
      constitutionDate: constitutionDate ? new Date(constitutionDate) : undefined,
      maxTermYears: maxTermYears ? parseInt(String(maxTermYears), 10) : undefined,
      termType,
      // Obligaciones fiscales
      rfc,
      satRegistrationNumber,
      satRegisteredAt: satRegisteredAt ? new Date(satRegisteredAt) : undefined,
    });

    // Registrar log de auditoría
    const requestInfo = extractRequestInfo(req);
    try {
      await createAuditLog({
        actorId: req.user.actorId,
        action: AuditAction.TRUST_CREATED,
        entityType: EntityType.TRUST,
        entityId: trust.id,
        trustId: trust.trustId,
        description: `Fideicomiso ${trust.trustId} creado con patrimonio inicial de $${initialCapitalNum} MXN`,
        ipAddress: requestInfo.ipAddress,
        userAgent: requestInfo.userAgent,
        metadata: {
          trustId: trust.trustId,
          name: name || null,
          initialCapital: initialCapitalNum.toString(),
          bondLimitPercent: bondLimitPercent || 30,
          otherLimitPercent: otherLimitPercent || 70,
        },
      });
    } catch (error) {
      console.error('⚠️  Error registrando log de auditoría:', error);
    }

    res.status(201).json(trust);
  } catch (error: any) {
    console.error('❌ Error en ruta POST /trusts:', error);
    res.status(400).json({ error: error.message || 'Error al procesar la solicitud' });
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
      bondLimitPercent: summary.bondLimitPercent.toString(),
      otherLimitPercent: summary.otherLimitPercent.toString(),
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
    res.json({
      ...parties,
      comiteTecnico: parties.comiteTecnico.map(m => ({
        ...m,
        assignedAt: m.assignedAt.toISOString(),
      })),
      beneficiarios: parties.beneficiarios.map(b => ({
        ...b,
        assignedAt: b.assignedAt.toISOString(),
      })),
      auditores: parties.auditores.map(a => ({
        ...a,
        assignedAt: a.assignedAt.toISOString(),
      })),
      reguladores: parties.reguladores.map(r => ({
        ...r,
        assignedAt: r.assignedAt.toISOString(),
      })),
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
