/**
 * Contexto para manejar la selección global de fideicomiso
 * Permite que el estado del fideicomiso seleccionado se mantenga a lo largo de toda la aplicación
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trustsApi } from '../lib/api';
import { useAuth } from './AuthContext';

interface TrustSelectionContextType {
  trusts: any[];
  selectedTrustId: string;
  setSelectedTrustId: (trustId: string) => void;
  isLoading: boolean;
  hasMultipleTrusts: boolean;
}

const TrustSelectionContext = createContext<TrustSelectionContextType | undefined>(undefined);

export function TrustSelectionProvider({ children }: { children: ReactNode }) {
  const { actor } = useAuth();
  
  // Obtener fideicomisos a los que el usuario pertenece
  const { data: trusts, isLoading } = useQuery({
    queryKey: ['trusts'],
    queryFn: () => trustsApi.list(),
    enabled: !!actor,
  });

  // Estado del fideicomiso seleccionado, persistido en localStorage
  const [selectedTrustId, setSelectedTrustIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fidufi_selectedTrustId') || '';
    }
    return '';
  });

  // Función para actualizar el estado y persistirlo en localStorage
  const setSelectedTrustId = (trustId: string) => {
    setSelectedTrustIdState(trustId);
    if (typeof window !== 'undefined') {
      if (trustId) {
        localStorage.setItem('fidufi_selectedTrustId', trustId);
      } else {
        localStorage.removeItem('fidufi_selectedTrustId');
      }
    }
  };

  // Seleccionar automáticamente si solo hay un fideicomiso
  useEffect(() => {
    if (trusts && trusts.length > 0) {
      const savedTrustId = typeof window !== 'undefined' 
        ? localStorage.getItem('fidufi_selectedTrustId') 
        : null;
      
      if (trusts.length === 1) {
        // Solo hay uno, seleccionarlo automáticamente
        if (selectedTrustId !== trusts[0].trustId) {
          setSelectedTrustId(trusts[0].trustId);
        }
      } else if (!selectedTrustId && trusts.length > 0) {
        // Hay múltiples, si hay uno guardado y está en la lista, usarlo; si no, seleccionar el primero
        if (savedTrustId && trusts.find(t => t.trustId === savedTrustId)) {
          setSelectedTrustId(savedTrustId);
        } else {
          setSelectedTrustId(trusts[0].trustId);
        }
      } else if (selectedTrustId && !trusts.find(t => t.trustId === selectedTrustId)) {
        // Si el fideicomiso seleccionado ya no está en la lista, seleccionar el primero
        setSelectedTrustId(trusts[0].trustId);
      }
    } else if (trusts && trusts.length === 0 && selectedTrustId) {
      // Si no hay fideicomisos, limpiar la selección
      setSelectedTrustId('');
    }
  }, [trusts, selectedTrustId]);

  // Limpiar el estado cuando el usuario cierra sesión
  useEffect(() => {
    if (!actor && selectedTrustId) {
      setSelectedTrustId('');
    }
  }, [actor]);

  return (
    <TrustSelectionContext.Provider
      value={{
        trusts: trusts || [],
        selectedTrustId,
        setSelectedTrustId,
        isLoading,
        hasMultipleTrusts: (trusts?.length || 0) > 1,
      }}
    >
      {children}
    </TrustSelectionContext.Provider>
  );
}

export function useTrustSelection() {
  const context = useContext(TrustSelectionContext);
  if (context === undefined) {
    throw new Error('useTrustSelection debe usarse dentro de TrustSelectionProvider');
  }
  return context;
}
