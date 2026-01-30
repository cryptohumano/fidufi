/**
 * Reglas para validar honorarios del Fiduciario según Cláusula Decima Segunda del Contrato 10045
 * 
 * Según el contrato:
 * - Por estudio y aceptación: $5,000.00 (una sola vez, a la firma del contrato)
 * - Por manejo y administración anual: $18,000.00 (pagadera en su parte proporcional por mensualidad vencida)
 * - Por modificación: $5,000.00 (a la firma del convenio respectivo)
 * 
 * IMPORTANTE: "Para que el Fiduciario lleve a cabo cualquier acto derivado del presente contrato,
 * deberán estar cubiertos sus honorarios por todos los conceptos antes citados."
 */

import { ComplianceStatus } from '../generated/prisma/enums';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';

export interface FiduciarioFeeRuleResult {
  compliant: boolean;
  status: ComplianceStatus;
  message: string;
  details?: {
    studyFeePaid: boolean;
    monthlyFeesUpToDate: boolean;
    missingPayments?: Array<{ year: number; month: number }>;
  };
}

export interface FiduciarioFeeStatus {
  studyFeePaid: boolean;
  monthlyPayments: Array<{
    year: number;
    month: number;
    paid: boolean;
  }>;
  currentYear: number;
  currentMonth: number;
}

/**
 * Valida que los honorarios del fiduciario estén pagados antes de realizar cualquier acto
 * 
 * Según Cláusula Decima Segunda: "Para que el Fiduciario lleve a cabo cualquier acto
 * derivado del presente contrato, deberán estar cubiertos sus honorarios por todos los
 * conceptos antes citados."
 */
export function validateFiduciarioFeesPaid(feeStatus: FiduciarioFeeStatus): FiduciarioFeeRuleResult {
  // 1. Validar que el honorario de estudio esté pagado
  if (!feeStatus.studyFeePaid) {
    return {
      compliant: false,
      status: ComplianceStatus.NON_COMPLIANT,
      message: 'No se puede realizar el acto: el honorario de estudio y aceptación ($5,000.00) no está pagado',
      details: {
        studyFeePaid: false,
        monthlyFeesUpToDate: false,
      },
    };
  }

  // 2. Validar que los pagos mensuales estén al día
  // El honorario anual de $18,000 se paga proporcionalmente por mes = $1,500/mes
  const missingPayments: Array<{ year: number; month: number }> = [];

  // Verificar pagos hasta el mes actual
  for (let year = feeStatus.currentYear; year >= feeStatus.currentYear - 1; year--) {
    const startMonth = year === feeStatus.currentYear ? 1 : 1;
    const endMonth = year === feeStatus.currentYear ? feeStatus.currentMonth : 12;

    for (let month = startMonth; month <= endMonth; month++) {
      const payment = feeStatus.monthlyPayments.find(
        p => p.year === year && p.month === month
      );

      if (!payment || !payment.paid) {
        missingPayments.push({ year, month });
      }
    }
  }

  if (missingPayments.length > 0) {
    return {
      compliant: false,
      status: ComplianceStatus.NON_COMPLIANT,
      message: `No se puede realizar el acto: faltan ${missingPayments.length} pago(s) mensual(es) de honorarios`,
      details: {
        studyFeePaid: true,
        monthlyFeesUpToDate: false,
        missingPayments,
      },
    };
  }

  return {
    compliant: true,
    status: ComplianceStatus.COMPLIANT,
    message: 'Todos los honorarios del fiduciario están pagados',
    details: {
      studyFeePaid: true,
      monthlyFeesUpToDate: true,
    },
  };
}

/**
 * Calcula el monto proporcional mensual del honorario anual
 */
export function calculateMonthlyFeeAmount(annualFee: Decimal): Decimal {
  // $18,000 anuales / 12 meses = $1,500 mensuales
  return annualFee.div(12);
}
