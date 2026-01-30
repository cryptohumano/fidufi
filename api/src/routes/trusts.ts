/**
 * Routes para gestión de fideicomisos
 */

import { Router } from 'express';
import { getTrust, getTrustSummary, updateTrustLimits } from '../services/trustService';
import { authenticate, authorize } from '../middleware/auth';
import { ActorRole } from '../generated/prisma/enums';

const router = Router();

/**
 * GET /trusts/:trustId
 * Obtiene información de un fideicomiso
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
