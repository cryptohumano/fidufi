/**
 * Módulo centralizado de reglas de negocio
 * 
 * Este módulo exporta todas las funciones de validación de reglas
 * según el Contrato 10045 y las políticas del fideicomiso.
 */

export * from './investmentRules';
export * from './mortgageRules';
export * from './fiduciarioFeeRules';

// Re-exportar tipos comunes
export type { InvestmentRuleResult, InvestmentRuleContext } from './investmentRules';
export type { MortgageRuleResult, MortgageLoanData } from './mortgageRules';
export type { FiduciarioFeeRuleResult, FiduciarioFeeStatus } from './fiduciarioFeeRules';
