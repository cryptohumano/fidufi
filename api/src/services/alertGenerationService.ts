/**
 * Servicio de Generación de Alertas Avanzadas
 * 
 * Genera alertas proactivas sobre eventos críticos:
 * - Vencimientos (bonos, préstamos, seguros, documentos)
 * - Pagos pendientes (honorarios, préstamos, seguros)
 * - Límites de inversión (acercamiento y exceso)
 * - Reuniones del Comité Técnico
 */

import { prisma } from '../lib/prisma';
import { ActorRole } from '../generated/prisma/enums';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';
import { getTrust } from './trustService';
import { getTrustActors } from './actorTrustService';

// Tipos de alertas
export enum AlertType {
  EXPIRATION = 'EXPIRATION',
  PAYMENT = 'PAYMENT',
  COMPLIANCE = 'COMPLIANCE',
  MEETING = 'MEETING',
  DOCUMENT = 'DOCUMENT',
}

// Subtipos de alertas
export enum AlertSubtype {
  // Expiration
  BOND_MATURITY = 'BOND_MATURITY',
  LOAN_MATURITY = 'LOAN_MATURITY',
  INSURANCE_EXPIRY = 'INSURANCE_EXPIRY',
  DOCUMENT_EXPIRY = 'DOCUMENT_EXPIRY',
  
  // Payment
  FIDUCIARIO_FEE_DUE = 'FIDUCIARIO_FEE_DUE',
  MONTHLY_FEE_DUE = 'MONTHLY_FEE_DUE',
  LOAN_PAYMENT_DUE = 'LOAN_PAYMENT_DUE',
  INSURANCE_PAYMENT_DUE = 'INSURANCE_PAYMENT_DUE',
  
  // Compliance
  RULE_VIOLATION = 'RULE_VIOLATION',
  LIMIT_APPROACHING = 'LIMIT_APPROACHING',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  EXCEPTION_PENDING = 'EXCEPTION_PENDING',
  EXCEPTION_APPROVED = 'EXCEPTION_APPROVED',
  EXCEPTION_REJECTED = 'EXCEPTION_REJECTED',
  EXCEPTION_VOTE = 'EXCEPTION_VOTE',
  
  // Meeting
  COMITE_MEETING_DUE = 'COMITE_MEETING_DUE',
  MEETING_REMINDER = 'MEETING_REMINDER',
  
  // Document
  DOCUMENT_MISSING = 'DOCUMENT_MISSING',
  DOCUMENT_EXPIRING = 'DOCUMENT_EXPIRING',
  DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED',
}

// Configuración de umbrales
const ALERT_THRESHOLDS = {
  EXPIRATION: {
    WARNING_DAYS: 30,
    CRITICAL_DAYS: 7,
  },
  PAYMENT: {
    WARNING_DAYS: 7,
    CRITICAL_DAYS: 3,
  },
  COMPLIANCE: {
    LIMIT_WARNING_PERCENT: 0.90,
    LIMIT_CRITICAL_PERCENT: 0.95,
  },
};

/**
 * Genera alertas de vencimiento para activos
 */
export async function generateExpirationAlerts(trustId: string): Promise<number> {
  const trust = await getTrust(trustId);
  const now = new Date();
  let alertsCreated = 0;

  // Obtener activos con información de vencimiento (si se almacena en metadata)
  // Por ahora, esto es un placeholder - necesitaríamos agregar campos de vencimiento al modelo Asset
  // o almacenarlos en validationResults/metadata
  
  // Ejemplo conceptual:
  // const assetsWithExpiration = await prisma.asset.findMany({
  //   where: {
  //     trustId,
  //     // Filtros para activos con fechas de vencimiento
  //   },
  // });

  // Por ahora, retornamos 0 ya que necesitamos extender el modelo Asset
  // para almacenar fechas de vencimiento
  return alertsCreated;
}

/**
 * Genera alertas de pagos pendientes
 */
export async function generatePaymentAlerts(trustId: string): Promise<number> {
  let alertsCreated = 0;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 1. Verificar honorarios del fiduciario
  const fiduciarioFee = await prisma.fiduciarioFee.findUnique({
    where: { trustId },
    include: {
      monthlyPayments: true,
    },
  });

  if (fiduciarioFee) {
    // Verificar pago de estudio
    if (!fiduciarioFee.studyFeePaid) {
      const fiduciarios = await getTrustActors(trustId, ActorRole.FIDUCIARIO);
      for (const membership of fiduciarios) {
        await prisma.alert.create({
          data: {
            actorId: membership.actorId,
            message: `Pago de honorarios de estudio pendiente: $${fiduciarioFee.studyFee.toFixed(2)} MXN`,
            severity: 'warning',
            alertType: AlertType.PAYMENT,
            alertSubtype: AlertSubtype.FIDUCIARIO_FEE_DUE,
            metadata: {
              paymentType: 'STUDY_FEE',
              amount: fiduciarioFee.studyFee.toString(),
              dueDate: fiduciarioFee.lastUpdated.toISOString(),
            },
          },
        });
        alertsCreated++;
      }
    }

    // Verificar pagos mensuales pendientes
    const monthlyPayment = fiduciarioFee.monthlyPayments.find(
      (p) => p.year === currentYear && p.month === currentMonth
    );

    if (!monthlyPayment || !monthlyPayment.paid) {
      const daysUntilDue = 5; // Asumimos que el pago vence el día 5 de cada mes
      const daysUntilNextMonth = new Date(currentYear, currentMonth, 0).getDate() - now.getDate() + 5;

      if (daysUntilNextMonth <= ALERT_THRESHOLDS.PAYMENT.WARNING_DAYS) {
        const fiduciarios = await getTrustActors(trustId, ActorRole.FIDUCIARIO);
        const severity = daysUntilNextMonth <= ALERT_THRESHOLDS.PAYMENT.CRITICAL_DAYS ? 'critical' : 'warning';

        for (const membership of fiduciarios) {
          await prisma.alert.create({
            data: {
              actorId: membership.actorId,
              message: `Pago mensual de honorarios vence en ${daysUntilNextMonth} días: $${fiduciarioFee.annualFee.div(12).toFixed(2)} MXN`,
              severity,
              alertType: AlertType.PAYMENT,
              alertSubtype: AlertSubtype.MONTHLY_FEE_DUE,
              metadata: {
                paymentType: 'MONTHLY_FEE',
                amount: fiduciarioFee.annualFee.div(12).toString(),
                dueDate: new Date(currentYear, currentMonth, 5).toISOString(),
                daysUntilDue: daysUntilNextMonth,
              },
            },
          });
          alertsCreated++;
        }
      }
    }
  }

  return alertsCreated;
}

/**
 * Genera alertas de límites de inversión
 */
export async function generateComplianceLimitAlerts(trustId: string): Promise<number> {
  let alertsCreated = 0;
  const trust = await getTrust(trustId);

  // Obtener activos cumplientes del fideicomiso
  const compliantAssets = await prisma.asset.findMany({
    where: {
      trustId,
      compliant: true,
      complianceStatus: {
        in: ['COMPLIANT', 'EXCEPTION_APPROVED'],
      },
    },
    select: {
      assetType: true,
      valueMxn: true,
    },
  });

  // Calcular totales por tipo
  const bondTotal = compliantAssets
    .filter((a) => a.assetType === 'GovernmentBond')
    .reduce((sum, a) => sum.plus(a.valueMxn), new Decimal(0));

  const otherTotal = compliantAssets
    .filter((a) => a.assetType !== 'GovernmentBond')
    .reduce((sum, a) => sum.plus(a.valueMxn), new Decimal(0));

  const totalInvested = bondTotal.plus(otherTotal);
  const bondLimit = trust.initialCapital.times(trust.bondLimitPercent).div(100);
  const otherLimit = trust.initialCapital.times(trust.otherLimitPercent).div(100);

  // Verificar límite de bonos
  const bondPercentage = bondTotal.div(trust.initialCapital).times(100);
  const bondLimitPercentage = bondLimit.div(trust.initialCapital).times(100);
  const bondUsage = bondTotal.div(bondLimit);

  if (bondUsage.gte(ALERT_THRESHOLDS.COMPLIANCE.LIMIT_CRITICAL_PERCENT)) {
    const fiduciarios = await getTrustActors(trustId, ActorRole.FIDUCIARIO);
    const comiteTecnico = await getTrustActors(trustId, ActorRole.COMITE_TECNICO);

    const message = `Inversión en bonos alcanza el ${bondPercentage.toFixed(2)}% del patrimonio (límite: ${bondLimitPercentage.toFixed(2)}%)`;

    for (const membership of [...fiduciarios, ...comiteTecnico]) {
      await prisma.alert.create({
        data: {
          actorId: membership.actorId,
          message,
          severity: 'critical',
          alertType: AlertType.COMPLIANCE,
          alertSubtype: AlertSubtype.LIMIT_EXCEEDED,
          metadata: {
            ruleName: 'BOND_LIMIT',
            currentValue: bondTotal.toString(),
            limitValue: bondLimit.toString(),
            percentage: bondPercentage.toNumber(),
            usage: bondUsage.toNumber(),
          },
        },
      });
      alertsCreated++;
    }
  } else if (bondUsage.gte(ALERT_THRESHOLDS.COMPLIANCE.LIMIT_WARNING_PERCENT)) {
    const fiduciarios = await getTrustActors(trustId, ActorRole.FIDUCIARIO);
    const comiteTecnico = await getTrustActors(trustId, ActorRole.COMITE_TECNICO);

    const message = `Inversión en bonos se acerca al límite: ${bondPercentage.toFixed(2)}% del patrimonio (límite: ${bondLimitPercentage.toFixed(2)}%)`;

    for (const membership of [...fiduciarios, ...comiteTecnico]) {
      await prisma.alert.create({
        data: {
          actorId: membership.actorId,
          message,
          severity: 'warning',
          alertType: AlertType.COMPLIANCE,
          alertSubtype: AlertSubtype.LIMIT_APPROACHING,
          metadata: {
            ruleName: 'BOND_LIMIT',
            currentValue: bondTotal.toString(),
            limitValue: bondLimit.toString(),
            percentage: bondPercentage.toNumber(),
            usage: bondUsage.toNumber(),
          },
        },
      });
      alertsCreated++;
    }
  }

  // Verificar límite de otros activos
  const otherPercentage = otherTotal.div(trust.initialCapital).times(100);
  const otherLimitPercentage = otherLimit.div(trust.initialCapital).times(100);
  const otherUsage = otherTotal.div(otherLimit);

  if (otherUsage.gte(ALERT_THRESHOLDS.COMPLIANCE.LIMIT_CRITICAL_PERCENT)) {
    const fiduciarios = await getTrustActors(trustId, ActorRole.FIDUCIARIO);
    const comiteTecnico = await getTrustActors(trustId, ActorRole.COMITE_TECNICO);

    const message = `Inversión en otros activos alcanza el ${otherPercentage.toFixed(2)}% del patrimonio (límite: ${otherLimitPercentage.toFixed(2)}%)`;

    for (const membership of [...fiduciarios, ...comiteTecnico]) {
      await prisma.alert.create({
        data: {
          actorId: membership.actorId,
          message,
          severity: 'critical',
          alertType: AlertType.COMPLIANCE,
          alertSubtype: AlertSubtype.LIMIT_EXCEEDED,
          metadata: {
            ruleName: 'OTHER_LIMIT',
            currentValue: otherTotal.toString(),
            limitValue: otherLimit.toString(),
            percentage: otherPercentage.toNumber(),
            usage: otherUsage.toNumber(),
          },
        },
      });
      alertsCreated++;
    }
  } else if (otherUsage.gte(ALERT_THRESHOLDS.COMPLIANCE.LIMIT_WARNING_PERCENT)) {
    const fiduciarios = await getTrustActors(trustId, ActorRole.FIDUCIARIO);
    const comiteTecnico = await getTrustActors(trustId, ActorRole.COMITE_TECNICO);

    const message = `Inversión en otros activos se acerca al límite: ${otherPercentage.toFixed(2)}% del patrimonio (límite: ${otherLimitPercentage.toFixed(2)}%)`;

    for (const membership of [...fiduciarios, ...comiteTecnico]) {
      await prisma.alert.create({
        data: {
          actorId: membership.actorId,
          message,
          severity: 'warning',
          alertType: AlertType.COMPLIANCE,
          alertSubtype: AlertSubtype.LIMIT_APPROACHING,
          metadata: {
            ruleName: 'OTHER_LIMIT',
            currentValue: otherTotal.toString(),
            limitValue: otherLimit.toString(),
            percentage: otherPercentage.toNumber(),
            usage: otherUsage.toNumber(),
          },
        },
      });
      alertsCreated++;
    }
  }

  return alertsCreated;
}

/**
 * Genera alertas de excepciones pendientes de revisión
 */
export async function generatePendingExceptionAlerts(trustId: string): Promise<number> {
  let alertsCreated = 0;

  // Obtener activos pendientes de revisión
  const pendingAssets = await prisma.asset.findMany({
    where: {
      trustId,
      complianceStatus: 'PENDING_REVIEW',
    },
  });

  if (pendingAssets.length > 0) {
    const comiteTecnico = await getTrustActors(trustId, ActorRole.COMITE_TECNICO);

    for (const asset of pendingAssets) {
      // Verificar si ya existe una alerta para este activo y este tipo
      const existingAlert = await prisma.alert.findFirst({
        where: {
          assetId: asset.id,
          alertType: AlertType.COMPLIANCE as string,
          alertSubtype: AlertSubtype.EXCEPTION_PENDING as string,
          acknowledged: false,
        },
      });

      if (!existingAlert) {
        for (const membership of comiteTecnico) {
          await prisma.alert.create({
            data: {
              assetId: asset.id,
              actorId: membership.actorId,
              message: `Activo ${asset.id} requiere revisión del Comité Técnico para aprobación de excepción`,
              severity: 'warning',
              alertType: AlertType.COMPLIANCE,
              alertSubtype: AlertSubtype.EXCEPTION_PENDING,
              metadata: {
                assetType: asset.assetType,
                valueMxn: asset.valueMxn.toString(),
              },
            },
          });
          alertsCreated++;
        }
      }
    }
  }

  return alertsCreated;
}

/**
 * Genera alertas de reuniones del Comité Técnico
 * Según el contrato, las reuniones son cada 3 meses
 */
export async function generateMeetingAlerts(trustId: string): Promise<number> {
  let alertsCreated = 0;
  const now = new Date();

  // Calcular próxima reunión (cada 3 meses desde la creación del fideicomiso)
  const trust = await getTrust(trustId);
  const trustCreatedAt = trust.createdAt || new Date();
  
  // Calcular meses desde la creación
  const monthsSinceCreation = (now.getFullYear() - trustCreatedAt.getFullYear()) * 12 + 
                              (now.getMonth() - trustCreatedAt.getMonth());
  
  // Próxima reunión es el siguiente múltiplo de 3 meses
  const nextMeetingMonths = Math.ceil((monthsSinceCreation + 1) / 3) * 3;
  const nextMeetingDate = new Date(trustCreatedAt);
  nextMeetingDate.setMonth(trustCreatedAt.getMonth() + nextMeetingMonths);
  nextMeetingDate.setDate(15); // Asumimos reunión el día 15

  const daysUntilMeeting = Math.ceil((nextMeetingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilMeeting <= 30 && daysUntilMeeting >= 0) {
    const comiteTecnico = await getTrustActors(trustId, ActorRole.COMITE_TECNICO);
    const fiduciarios = await getTrustActors(trustId, ActorRole.FIDUCIARIO);

    const severity = daysUntilMeeting <= 7 ? 'warning' : 'info';
    const message = `Reunión del Comité Técnico programada para el ${nextMeetingDate.toLocaleDateString('es-MX')} (${daysUntilMeeting} días)`;

    for (const membership of [...comiteTecnico, ...fiduciarios]) {
      // Verificar si ya existe una alerta para esta fecha
      // Nota: La búsqueda por metadata requiere una consulta más compleja
      // Por ahora, verificamos si existe una alerta del mismo tipo sin reconocer
      const existingAlert = await prisma.alert.findFirst({
        where: {
          actorId: membership.actorId,
          alertType: AlertType.MEETING as string,
          alertSubtype: AlertSubtype.COMITE_MEETING_DUE as string,
          acknowledged: false,
          createdAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Últimos 7 días
          },
        },
      });

      if (!existingAlert) {
        await prisma.alert.create({
          data: {
            actorId: membership.actorId,
            message,
            severity,
            alertType: AlertType.MEETING,
            alertSubtype: AlertSubtype.COMITE_MEETING_DUE,
            metadata: {
              meetingDate: nextMeetingDate.toISOString(),
              meetingType: 'QUARTERLY',
              daysUntilMeeting,
            },
          },
        });
        alertsCreated++;
      }
    }
  }

  return alertsCreated;
}

/**
 * Genera todas las alertas avanzadas para un fideicomiso
 */
export async function generateAllAlerts(trustId: string): Promise<{
  expiration: number;
  payment: number;
  compliance: number;
  pendingExceptions: number;
  meeting: number;
  total: number;
}> {
  const results = await Promise.all([
    generateExpirationAlerts(trustId),
    generatePaymentAlerts(trustId),
    generateComplianceLimitAlerts(trustId),
    generatePendingExceptionAlerts(trustId),
    generateMeetingAlerts(trustId),
  ]);

  return {
    expiration: results[0],
    payment: results[1],
    compliance: results[2],
    pendingExceptions: results[3],
    meeting: results[4],
    total: results.reduce((sum, count) => sum + count, 0),
  };
}

/**
 * Genera alertas para todos los fideicomisos activos
 */
export async function generateAlertsForAllTrusts(): Promise<{
  [trustId: string]: {
    expiration: number;
    payment: number;
    compliance: number;
    pendingExceptions: number;
    meeting: number;
    total: number;
  };
}> {
  const activeTrusts = await prisma.trust.findMany({
    where: { active: true },
    select: { trustId: true },
  });

  const results: any = {};

  for (const trust of activeTrusts) {
    results[trust.trustId] = await generateAllAlerts(trust.trustId);
  }

  return results;
}
