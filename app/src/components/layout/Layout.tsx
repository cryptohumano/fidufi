/**
 * Layout principal de la aplicación
 */

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { DateTimeDisplay } from '../common/DateTimeDisplay';
import { LogOut, Home, FileText, AlertCircle, User, Shield, FileSearch, Building2 } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { actor, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  const getDashboardRoute = () => {
    if (!actor) return '/';
    const dashboardRoutes: Record<string, string> = {
      SUPER_ADMIN: '/admin',
      FIDUCIARIO: '/dashboard/fiduciario',
      COMITE_TECNICO: '/dashboard/comite-tecnico',
      AUDITOR: '/dashboard/auditor',
      REGULADOR: '/dashboard/regulador',
      BENEFICIARIO: '/dashboard/beneficiario',
    };
    return dashboardRoutes[actor.role] || '/';
  };

  const navigation = [
    { name: 'Dashboard', href: getDashboardRoute(), icon: Home },
    { name: 'Activos', href: '/assets', icon: FileText },
    { name: 'Alertas', href: '/alerts', icon: AlertCircle },
    { name: 'Logs de Auditoría', href: '/audit-logs', icon: FileSearch },
  ];

  // Agregar Admin y Gestión de Fideicomisos solo para Super Admin
  if (actor?.role === 'SUPER_ADMIN' || actor?.isSuperAdmin) {
    navigation.push({ name: 'Admin', href: '/admin', icon: Shield });
    navigation.push({ name: 'Fideicomisos', href: '/trusts/manage', icon: Building2 });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-2xl font-bold text-foreground">
              fidufi
            </Link>
            {isAuthenticated && (
              <nav className="hidden md:flex gap-4">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {isAuthenticated && actor && (
            <div className="flex items-center gap-4">
              <DateTimeDisplay />
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{actor.name || 'Sin nombre'}</span>
                <span className="text-muted-foreground">({actor.role})</span>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
