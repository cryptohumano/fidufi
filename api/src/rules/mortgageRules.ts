/**
 * Reglas para préstamos hipotecarios según Cláusula Cuarta-b del Contrato 10045
 * 
 * Requisitos según el contrato:
 * - Precio ≤ 10 × salario mínimo general del área geográfica, elevado al año
 * - Plazo: 10 a 20 años, mediante enteros mensuales iguales
 * - Requiere garantía hipotecaria o fiduciaria sobre los bienes
 * - Requiere seguro de vida que cubra el saldo insoluto
 * - Requiere seguro contra incendio
 * - Interés no debe exceder la tasa del rendimiento máximo del 30% de la reserva
 */

import { ComplianceStatus } from '../generated/prisma/enums';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';

export interface MortgageRuleResult {
  compliant: boolean;
  status: ComplianceStatus;
  message: string;
  details?: Record<string, any>;
}

export interface MortgageLoanData {
  price: Decimal; // Precio del inmueble
  loanAmount: Decimal; // Monto del préstamo
  termYears: number; // Plazo en años (debe ser 10-20 años)
  monthlyPayment: Decimal; // Enteros mensuales iguales
  hasMortgageGuarantee: boolean; // Garantía hipotecaria o fiduciaria
  hasLifeInsurance: boolean; // Seguro de vida que cubre el saldo insoluto
  hasFireInsurance: boolean; // Seguro contra incendio
  interestRate: Decimal; // Tasa de interés del préstamo (como porcentaje)
  areaMinimumWage: Decimal; // Salario mínimo general del área geográfica, elevado al año
  maxBondYieldRate?: Decimal; // Tasa máxima de rendimiento del 30% de la reserva (para validar interés)
}

/**
 * Valida que el precio del inmueble no exceda 10 veces el salario mínimo anual
 */
export function validatePriceLimit(data: MortgageLoanData): MortgageRuleResult {
  const maxPrice = data.areaMinimumWage.mul(10);
  const exceedsLimit = data.price.gt(maxPrice);

  return {
    compliant: !exceedsLimit,
    status: exceedsLimit ? ComplianceStatus.NON_COMPLIANT : ComplianceStatus.COMPLIANT,
    message: exceedsLimit
      ? `El precio del inmueble (${data.price.toFixed(2)}) excede 10 veces el salario mínimo anual (${maxPrice.toFixed(2)})`
      : `El precio del inmueble está dentro del límite permitido`,
    details: {
      price: data.price.toString(),
      maxPrice: maxPrice.toString(),
      areaMinimumWage: data.areaMinimumWage.toString(),
      multiplier: 10,
    },
  };
}

/**
 * Valida que el plazo esté entre 10 y 20 años
 */
export function validateTermRange(data: MortgageLoanData): MortgageRuleResult {
  const validTerm = data.termYears >= 10 && data.termYears <= 20;

  return {
    compliant: validTerm,
    status: validTerm ? ComplianceStatus.COMPLIANT : ComplianceStatus.NON_COMPLIANT,
    message: validTerm
      ? `El plazo de ${data.termYears} años está dentro del rango permitido (10-20 años)`
      : `El plazo de ${data.termYears} años está fuera del rango permitido (10-20 años)`,
    details: {
      termYears: data.termYears,
      minTerm: 10,
      maxTerm: 20,
    },
  };
}

/**
 * Valida que tenga garantía hipotecaria o fiduciaria
 */
export function validateGuaranteeRequirement(data: MortgageLoanData): MortgageRuleResult {
  return {
    compliant: data.hasMortgageGuarantee,
    status: data.hasMortgageGuarantee ? ComplianceStatus.COMPLIANT : ComplianceStatus.NON_COMPLIANT,
    message: data.hasMortgageGuarantee
      ? 'El préstamo cuenta con garantía hipotecaria o fiduciaria'
      : 'El préstamo requiere garantía hipotecaria o fiduciaria sobre los bienes',
    details: {
      hasMortgageGuarantee: data.hasMortgageGuarantee,
    },
  };
}

/**
 * Valida que tenga seguro de vida (que cubra el saldo insoluto) y seguro contra incendio
 */
export function validateInsuranceRequirements(data: MortgageLoanData): MortgageRuleResult {
  const hasRequiredInsurance = data.hasLifeInsurance && data.hasFireInsurance;
  const missingInsurances: string[] = [];

  if (!data.hasLifeInsurance) {
    missingInsurances.push('seguro de vida (que cubra el saldo insoluto)');
  }
  if (!data.hasFireInsurance) {
    missingInsurances.push('seguro contra incendio');
  }

  return {
    compliant: hasRequiredInsurance,
    status: hasRequiredInsurance ? ComplianceStatus.COMPLIANT : ComplianceStatus.NON_COMPLIANT,
    message: hasRequiredInsurance
      ? 'El préstamo cuenta con todos los seguros requeridos'
      : `Faltan los siguientes seguros requeridos: ${missingInsurances.join(', ')}`,
    details: {
      hasLifeInsurance: data.hasLifeInsurance,
      hasFireInsurance: data.hasFireInsurance,
      missingInsurances,
    },
  };
}

/**
 * Valida que el interés no exceda la tasa del rendimiento máximo del 30% de la reserva
 */
export function validateInterestRateLimit(data: MortgageLoanData): MortgageRuleResult {
  if (!data.maxBondYieldRate) {
    // Si no se proporciona la tasa máxima, no podemos validar
    return {
      compliant: true,
      status: ComplianceStatus.COMPLIANT,
      message: 'No se puede validar el límite de interés: falta la tasa máxima de rendimiento del 30% de la reserva',
      details: {
        interestRate: data.interestRate.toString(),
        maxBondYieldRate: null,
        note: 'Se requiere proporcionar maxBondYieldRate para validar esta regla',
      },
    };
  }

  const exceedsLimit = data.interestRate.gt(data.maxBondYieldRate);

  return {
    compliant: !exceedsLimit,
    status: exceedsLimit ? ComplianceStatus.NON_COMPLIANT : ComplianceStatus.COMPLIANT,
    message: exceedsLimit
      ? `La tasa de interés (${data.interestRate.toFixed(2)}%) excede la tasa máxima permitida (${data.maxBondYieldRate.toFixed(2)}%)`
      : `La tasa de interés está dentro del límite permitido`,
    details: {
      interestRate: data.interestRate.toString(),
      maxBondYieldRate: data.maxBondYieldRate.toString(),
    },
  };
}

/**
 * Valida todas las reglas para un préstamo hipotecario según Cláusula Cuarta-b
 */
export function validateMortgageLoan(data: MortgageLoanData): MortgageRuleResult[] {
  const results: MortgageRuleResult[] = [];

  // 1. Validar límite de precio (10 × salario mínimo anual)
  results.push(validatePriceLimit(data));
  
  // 2. Validar plazo (10-20 años)
  results.push(validateTermRange(data));
  
  // 3. Validar garantía hipotecaria o fiduciaria
  results.push(validateGuaranteeRequirement(data));
  
  // 4. Validar seguros requeridos (vida + contra incendio)
  results.push(validateInsuranceRequirements(data));
  
  // 5. Validar límite de tasa de interés (si se proporciona maxBondYieldRate)
  results.push(validateInterestRateLimit(data));

  return results;
}

/**
 * Determina el estado de cumplimiento general basado en los resultados de todas las reglas
 */
export function getOverallComplianceStatus(results: MortgageRuleResult[]): ComplianceStatus {
  const hasNonCompliant = results.some(r => !r.compliant);
  
  if (hasNonCompliant) {
    return ComplianceStatus.NON_COMPLIANT;
  }
  
  return ComplianceStatus.COMPLIANT;
}
