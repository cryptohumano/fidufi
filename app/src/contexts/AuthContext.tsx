/**
 * Contexto de autenticación
 * Maneja el estado de autenticación y el token JWT
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { actorsApi, Actor, OnboardActorData, OnboardResponse } from '../lib/api';

interface AuthContextType {
  actor: Actor | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: OnboardActorData) => Promise<void>;
  logout: () => void;
  refreshActor: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [actor, setActor] = useState<Actor | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar token y actor del localStorage al iniciar
  useEffect(() => {
    const savedToken = localStorage.getItem('fidufi_token');
    const savedActor = localStorage.getItem('fidufi_actor');

    if (savedToken && savedActor) {
      setToken(savedToken);
      try {
        const parsedActor = JSON.parse(savedActor);
        setActor(parsedActor);
      } catch {
        localStorage.removeItem('fidufi_token');
        localStorage.removeItem('fidufi_actor');
      }
    }
    setIsLoading(false);
  }, []);

  // Verificar token y cargar actor si hay token pero no actor cargado
  useEffect(() => {
    const loadActor = async () => {
      const currentToken = token || localStorage.getItem('fidufi_token');
      if (currentToken && !actor) {
        try {
          await refreshActor();
        } catch {
          // Si falla, intentar cargar desde localStorage como fallback
          const savedActor = localStorage.getItem('fidufi_actor');
          if (savedActor) {
            try {
              setActor(JSON.parse(savedActor));
            } catch {
              logout();
            }
          }
        }
      }
    };
    
    loadActor();
  }, [token]);

  const login = async (data: OnboardActorData | { id: string; role: any; primaryDid?: string | null; ethereumAddress?: string | null; polkadotAccountId?: string | null }) => {
    try {
      // Si viene con id, es un login directo (ya autenticado, solo actualizar estado)
      if ('id' in data && data.id) {
        const actor = await actorsApi.getById(data.id);
        setActor(actor);
        const token = localStorage.getItem('fidufi_token');
        if (token) setToken(token);
        return;
      }
      
      // Si no, es un registro nuevo con identidades blockchain
      const response: OnboardResponse = await actorsApi.onboard(data as OnboardActorData);
      setToken(response.token);
      setActor(response.actor);
      localStorage.setItem('fidufi_token', response.token);
      localStorage.setItem('fidufi_actor', JSON.stringify(response.actor));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  const logout = () => {
    setToken(null);
    setActor(null);
    localStorage.removeItem('fidufi_token');
    localStorage.removeItem('fidufi_actor');
  };

  const refreshActor = async () => {
    const currentToken = token || localStorage.getItem('fidufi_token');
    if (!currentToken) {
      throw new Error('No hay token disponible');
    }
    
    try {
      const updatedActor = await actorsApi.getMe();
      setActor(updatedActor);
      setToken(currentToken);
      localStorage.setItem('fidufi_token', currentToken);
      localStorage.setItem('fidufi_actor', JSON.stringify(updatedActor));
    } catch (error) {
      // Si falla, limpiar tokens inválidos
      console.warn('Error al refrescar actor:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        actor,
        token,
        isAuthenticated: !!token && !!actor,
        isLoading,
        login,
        logout,
        refreshActor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
