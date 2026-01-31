/**
 * Componente para proteger rutas que requieren autenticación
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

type ActorRole = 'SUPER_ADMIN' | 'FIDUCIARIO' | 'COMITE_TECNICO' | 'AUDITOR' | 'REGULADOR' | 'BENEFICIARIO';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: ActorRole | ActorRole[];
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
    // Convertir a array si es un string único
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    // Verificar si el usuario tiene alguno de los roles requeridos
    let hasAccess = false;
    
    for (const role of requiredRoles) {
      if (role === 'SUPER_ADMIN') {
        // Para SUPER_ADMIN, verificar tanto el rol como el flag isSuperAdmin
        if (actor?.role === 'SUPER_ADMIN' || actor?.isSuperAdmin) {
          hasAccess = true;
          break;
        }
      } else {
        if (actor?.role === role) {
          hasAccess = true;
          break;
        }
      }
    }

    if (!hasAccess) {
      const rolesText = Array.isArray(requiredRole) 
        ? requiredRole.join(' o ') 
        : requiredRole;
      
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
            <p className="text-muted-foreground">
              No tienes permisos para acceder a esta página.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Rol requerido: {rolesText} | Tu rol: {actor?.role || 'N/A'}
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
