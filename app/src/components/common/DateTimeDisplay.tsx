/**
 * Componente para mostrar fecha y hora local actualizada en tiempo real
 */

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface DateTimeDisplayProps {
  showIcon?: boolean;
  className?: string;
}

export function DateTimeDisplay({ showIcon = true, className = '' }: DateTimeDisplayProps) {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(new Date());
    }, 1000); // Actualizar cada segundo

    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && <Clock className="h-4 w-4 text-muted-foreground" />}
      <span className="text-sm text-muted-foreground">
        {formatDateTime(dateTime)}
      </span>
    </div>
  );
}
