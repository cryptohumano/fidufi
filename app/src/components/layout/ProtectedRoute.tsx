/**
 * Componente para proteger rutas que requieren autenticación
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'SUPER_ADMIN' | 'FIDUCIARIO' | 'COMITE_TECNICO' | 'AUDITOR' | 'REGULADOR' | 'BENEFICIARIO';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, actor, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    // Para SUPER_ADMIN, verificar tanto el rol como el flag isSuperAdmin
    const hasAccess = requiredRole === 'SUPER_ADMIN'
      ? (actor?.role === 'SUPER_ADMIN' || actor?.isSuperAdmin)
      : actor?.role === requiredRole;

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
            <p className="text-muted-foreground">
              No tienes permisos para acceder a esta página.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Rol requerido: {requiredRole} | Tu rol: {actor?.role || 'N/A'}
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
