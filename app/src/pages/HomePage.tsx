/**
 * Página de inicio
 */

import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { FileText, AlertCircle, TrendingUp, Shield } from 'lucide-react';

export function HomePage() {
  const { isAuthenticated, actor } = useAuth();
  const navigate = useNavigate();

  // Redirigir al dashboard correspondiente según el rol
  useEffect(() => {
    if (isAuthenticated && actor) {
      const dashboardRoutes: Record<string, string> = {
        SUPER_ADMIN: '/admin',
        FIDUCIARIO: '/dashboard/fiduciario',
        COMITE_TECNICO: '/dashboard/comite-tecnico',
        AUDITOR: '/dashboard/auditor',
        REGULADOR: '/dashboard/regulador',
        BENEFICIARIO: '/dashboard/beneficiario',
      };

      const dashboardRoute = dashboardRoutes[actor.role];
      if (dashboardRoute) {
        navigate(dashboardRoute, { replace: true });
      }
    }
  }, [isAuthenticated, actor, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <h1 className="text-5xl font-bold mb-6">fidufi</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Capa de cumplimiento técnico para fideicomisos irrevocables
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link to="/login">Iniciar Sesión</Link>
          </Button>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <Shield className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Cumplimiento Automático</h3>
            <p className="text-muted-foreground">
              Validación automática de reglas de inversión según el contrato fiduciario
            </p>
          </Card>
          <Card className="p-6">
            <FileText className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Registro de Activos</h3>
            <p className="text-muted-foreground">
              Registra y gestiona activos con validación en tiempo real
            </p>
          </Card>
          <Card className="p-6">
            <AlertCircle className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Alertas Inteligentes</h3>
            <p className="text-muted-foreground">
              Notificaciones automáticas por incumplimiento de reglas
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bienvenido, {actor?.name || 'Usuario'}</h1>
        <p className="text-muted-foreground">
          Rol: {actor?.role} | DID: {actor?.primaryDid || 'No configurado'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Acciones Rápidas</h2>
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {(actor?.role === 'FIDUCIARIO' || actor?.role === 'COMITE_TECNICO') && (
              <Button asChild className="w-full">
                <Link to="/assets/register">Registrar Nuevo Activo</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link to="/assets">Ver Activos</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/alerts">Ver Alertas</Link>
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Fideicomiso 10045</h2>
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">
            Fideicomiso para el Pago de Pensiones y Jubilaciones - Banco del Ahorro Nacional
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/trusts/10045">Ver Detalles</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
