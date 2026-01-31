/**
 * Componente de indicador de cumplimiento
 * Muestra el estado de cumplimiento con colores y barras de progreso
 */

import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

interface ComplianceIndicatorProps {
  label: string;
  current: number;
  limit: number;
  availableSpace: number;
  status: 'safe' | 'warning' | 'critical';
  currency?: boolean;
}

export function ComplianceIndicator({
  label,
  current,
  limit,
  availableSpace,
  status,
  currency = false,
}: ComplianceIndicatorProps) {
  const percentage = limit > 0 ? (current / limit) * 100 : 0;
  
  const formatValue = (value: number) => {
    if (currency) {
      return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString('es-MX');
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'critical':
        return 'Límite excedido';
      case 'warning':
        return 'Cerca del límite';
      default:
        return 'Dentro del límite';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{label}</h3>
        {getStatusIcon()}
      </div>
      
      <div className="space-y-2">
        <Progress 
          value={percentage} 
          max={100} 
          status={status}
          showLabel={false}
        />
        
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {formatValue(current)} / {formatValue(limit)}
          </span>
          <span className={`font-medium ${
            status === 'critical' ? 'text-red-600' :
            status === 'warning' ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {percentage.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {getStatusMessage()}
          </span>
          {availableSpace > 0 ? (
            <span className="text-xs font-medium text-green-600">
              Disponible: {formatValue(availableSpace)}
            </span>
          ) : availableSpace < 0 ? (
            <span className="text-xs font-medium text-red-600">
              Excede por: {formatValue(Math.abs(availableSpace))}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
