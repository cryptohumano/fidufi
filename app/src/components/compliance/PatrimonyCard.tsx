/**
 * Tarjeta de patrimonio con crecimiento
 */

import { Card } from '../ui/card';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface PatrimonyCardProps {
  initial: number;
  current: number;
  growth: number;
  growthAmount: number;
}

export function PatrimonyCard({
  initial,
  current,
  growth,
  growthAmount,
}: PatrimonyCardProps) {
  const isPositive = growth >= 0;
  const GrowthIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Patrimonio</h3>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Patrimonio Actual</p>
          <p className="text-2xl font-bold">
            ${current.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Patrimonio Inicial</span>
            <span className="text-sm font-medium">
              ${initial.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Crecimiento</span>
            <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <GrowthIcon className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {isPositive ? '+' : ''}{growth.toFixed(2)}%
              </span>
            </div>
          </div>
          
          {growthAmount !== 0 && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {isPositive ? 'Ganancia' : 'Pérdida'}:{' '}
                <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}${Math.abs(growthAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
