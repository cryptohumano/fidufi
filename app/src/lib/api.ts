/**
 * Cliente API para comunicarse con el backend
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fidufi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      localStorage.removeItem('fidufi_token');
      localStorage.removeItem('fidufi_actor');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Tipos
export type ActorRole = 'SUPER_ADMIN' | 'FIDUCIARIO' | 'COMITE_TECNICO' | 'AUDITOR' | 'REGULADOR';

export interface Actor {
  id: string;
  name: string | null;
  email: string | null;
  role: ActorRole;
  isSuperAdmin?: boolean;
  primaryDid: string | null;
  ethereumAddress: string | null;
  polkadotAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardActorData {
  name?: string;
  role: 'FIDUCIARIO' | 'COMITE_TECNICO' | 'AUDITOR' | 'REGULADOR';
  primaryDid?: string;
  ethereumAddress?: string;
  polkadotAccountId?: string;
  ensName?: string;
}

export interface OnboardResponse {
  actor: Actor;
  token: string;
}

export interface Asset {
  id: string;
  trustId: string;
  assetType: string;
  valueMxn: string;
  description: string | null;
  complianceStatus: string;
  compliant: boolean;
  vcHash: string | null;
  blockchainTxHash: string | null;
  blockchainNetwork: string | null;
  registeredAt: string;
}

export interface RegisterAssetData {
  trustId: string;
  assetType: 'GovernmentBond' | 'MortgageLoan' | 'InsuranceReserve' | 'CNBVApproved' | 'SocialHousing';
  valueMxn: number;
  description?: string;
  documentHash?: string;
  beneficiaryId?: string; // ID del beneficiario (opcional, para préstamos hipotecarios y vivienda social)
  mortgageData?: {
    propertyPrice: number;
    loanTerm: number;
    hasMortgageGuarantee: boolean;
    hasLifeInsurance: boolean;
    hasFireInsurance: boolean;
    interestRate: number;
    areaMinimumWage: number;
    maxBondYieldRate?: number;
  };
}

export interface Trust {
  id: string;
  trustId: string;
  name: string | null;
  initialCapital: string;
  bondLimitPercent: string;
  otherLimitPercent: string;
  active: boolean;
}

export interface Alert {
  id: string;
  assetId: string;
  actorId: string;
  message: string;
  severity: string;
  acknowledged: boolean;
  createdAt: string;
}

// API functions
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },
  
  register: async (data: { email: string; password: string; name?: string; role: string }) => {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },
};

export const actorsApi = {
  onboard: async (data: OnboardActorData): Promise<OnboardResponse> => {
    const response = await api.post('/api/actors/onboard', data);
    return response.data;
  },
  
  getMe: async (): Promise<Actor> => {
    const response = await api.get('/api/actors/me');
    const actor = response.data;
    // Asegurar que isSuperAdmin esté presente
    return {
      ...actor,
      isSuperAdmin: actor.isSuperAdmin || actor.role === 'SUPER_ADMIN',
    };
  },
  
  getById: async (id: string): Promise<Actor> => {
    const response = await api.get(`/api/actors/${id}`);
    return response.data;
  },
};

export const assetsApi = {
  register: async (data: RegisterAssetData) => {
    const response = await api.post('/api/assets/register', data);
    return response.data;
  },
  
  list: async (trustId: string, filters?: {
    assetType?: string;
    complianceStatus?: string;
    limit?: number;
    offset?: number;
    beneficiaryId?: string;
  }) => {
    const params = new URLSearchParams({ trustId, ...filters as any });
    const response = await api.get(`/api/assets?${params}`);
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/api/assets/${id}`);
    return response.data;
  },
};

export const trustsApi = {
  getById: async (trustId: string): Promise<Trust> => {
    const response = await api.get(`/api/trusts/${trustId}`);
    return response.data;
  },
  
  getSummary: async (trustId: string) => {
    const response = await api.get(`/api/trusts/${trustId}/summary`);
    return response.data;
  },
};

export const alertsApi = {
  list: async (actorId?: string, filters?: {
    acknowledged?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (actorId) params.append('actorId', actorId);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }
    const response = await api.get(`/api/alerts?${params}`);
    return response.data;
  },
  
  acknowledge: async (id: string) => {
    const response = await api.put(`/api/alerts/${id}/acknowledge`);
    return response.data;
  },
};

export const actorTrustApi = {
  getTrustActors: async (trustId: string, roleInTrust?: string) => {
    const params = roleInTrust ? `?role=${roleInTrust}` : '';
    const response = await api.get(`/api/actor-trust/trust/${trustId}${params}`);
    return response.data;
  },
  
  getActorTrusts: async (actorId: string) => {
    const response = await api.get(`/api/actor-trust/actor/${actorId}`);
    return response.data;
  },
};

export const adminApi = {
  getUsers: async () => {
    const response = await api.get('/api/admin/users');
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get('/api/admin/stats');
    return response.data;
  },
  
  createUser: async (data: { email: string; password: string; name?: string; role: string }) => {
    const response = await api.post('/api/admin/users', data);
    return response.data;
  },
  
  updateUser: async (id: string, data: { name?: string; email?: string; role?: string; password?: string }) => {
    const response = await api.put(`/api/admin/users/${id}`, data);
    return response.data;
  },
  
  deleteUser: async (id: string) => {
    const response = await api.delete(`/api/admin/users/${id}`);
    return response.data;
  },
};
