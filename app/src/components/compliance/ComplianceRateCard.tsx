/**
 * Tarjeta de tasa de cumplimiento
 */

import { Card } from '../ui/card';
import { CheckCircle2, XCircle, TrendingUp } from 'lucide-react';

interface ComplianceRateCardProps {
  rate: number;
  compliantCount: number;
  nonCompliantCount: number;
  totalAssets: number;
}

export function ComplianceRateCard({
  rate,
  compliantCount,
  nonCompliantCount,
  totalAssets,
}: ComplianceRateCardProps) {
  const getRateColor = () => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRateStatus = () => {
    if (rate >= 90) return 'Excelente';
    if (rate >= 70) return 'Bueno';
    return 'Requiere atención';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Tasa de Cumplimiento</h3>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="space-y-4">
        <div>
          <p className={`text-4xl font-bold ${getRateColor()}`}>
            {rate.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {getRateStatus()}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-lg font-semibold">{compliantCount}</p>
              <p className="text-xs text-muted-foreground">Cumplen</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-lg font-semibold">{nonCompliantCount}</p>
              <p className="text-xs text-muted-foreground">No cumplen</p>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          Total: {totalAssets} activos registrados
        </p>
      </div>
    </Card>
  );
}
