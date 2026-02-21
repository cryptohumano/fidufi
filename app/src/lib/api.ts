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
  login: async (email: string, password: string, location?: { latitude?: number; longitude?: number; accuracy?: number } | null) => {
    const response = await api.post('/api/auth/login', { 
      email, 
      password,
      location, // Incluir datos de GPS si están disponibles
    });
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
    const params = new URLSearchParams({ trustId });
    
    // Solo agregar parámetros que no sean undefined o vacíos
    if (filters) {
      if (filters.assetType) {
        params.append('assetType', filters.assetType);
      }
      if (filters.complianceStatus) {
        params.append('complianceStatus', filters.complianceStatus);
      }
      if (filters.limit !== undefined) {
        params.append('limit', filters.limit.toString());
      }
      if (filters.offset !== undefined) {
        params.append('offset', filters.offset.toString());
      }
      if (filters.beneficiaryId) {
        params.append('beneficiaryId', filters.beneficiaryId);
      }
    }
    
    const response = await api.get(`/api/assets?${params}`);
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/api/assets/${id}`);
    return response.data;
  },
  
  approveException: async (id: string, reason?: string) => {
    const response = await api.put(`/api/assets/${id}/approve-exception`, { reason });
    return response.data;
  },
  
  rejectException: async (id: string, reason?: string) => {
    const response = await api.put(`/api/assets/${id}/reject-exception`, { reason });
    return response.data;
  },
};

export const trustsApi = {
  list: async () => {
    const response = await api.get('/api/trusts');
    return response.data;
  },
  
  create: async (data: {
    trustId?: string; // Opcional: se genera automáticamente si no se proporciona
    name?: string;
    initialCapital: number;
    bondLimitPercent?: number;
    otherLimitPercent?: number;
    constitutionDate?: string; // Fecha de constitución (YYYY-MM-DD)
    maxTermYears?: number; // Plazo máximo en años (1-99)
    termType?: 'STANDARD' | 'FOREIGN' | 'DISABILITY'; // Tipo de plazo
    requiresConsensus?: boolean; // Si requiere mayoría para aprobar excepciones
  }) => {
    const response = await api.post('/api/trusts', data);
    return response.data;
  },
  
  getById: async (trustId: string): Promise<Trust> => {
    const response = await api.get(`/api/trusts/${trustId}`);
    return response.data;
  },
  
  getSummary: async (trustId: string) => {
    const response = await api.get(`/api/trusts/${trustId}/summary`);
    return response.data;
  },
  
  getAnalytics: async (trustId: string) => {
    const response = await api.get(`/api/trusts/${trustId}/analytics`);
    return response.data;
  },
  
  getOrganization: async (trustId: string) => {
    const response = await api.get(`/api/trusts/${trustId}/organization`);
    return response.data;
  },
  
  getOrganizationSummary: async (trustId: string) => {
    const response = await api.get(`/api/trusts/${trustId}/organization/summary`);
    return response.data;
  },
  
  updateLimits: async (trustId: string, data: { bondLimitPercent?: number; otherLimitPercent?: number }) => {
    const response = await api.put(`/api/trusts/${trustId}/limits`, data);
    return response.data;
  },
  
  getTimeline: async (trustId: string) => {
    const response = await api.get(`/api/trusts/${trustId}/timeline`);
    return response.data;
  },
  
  getParties: async (trustId: string) => {
    const response = await api.get(`/api/trusts/${trustId}/parties`);
    return response.data;
  },
};

export const alertsApi = {
  list: async (trustId?: string, filters?: {
    acknowledged?: boolean;
    limit?: number;
    offset?: number;
    alertType?: string;
    alertSubtype?: string;
    severity?: string;
  }) => {
    const params = new URLSearchParams();
    if (trustId) params.append('trustId', trustId);
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
  
  generate: async (trustId?: string) => {
    const response = await api.post('/api/alerts/generate', { trustId });
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
  
  assignActor: async (data: { actorId: string; trustId: string; roleInTrust: string }) => {
    const response = await api.post('/api/actor-trust', data);
    return response.data;
  },
  
  revokeActor: async (actorId: string, trustId: string) => {
    const response = await api.delete(`/api/actor-trust/${actorId}/${trustId}`);
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

export const auditLogsApi = {
  list: async (filters?: {
    actorId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    trustId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get(`/api/audit-logs?${params}`);
    return response.data;
  },
  
  getByEntity: async (entityType: string, entityId: string, limit?: number) => {
    const params = limit ? `?limit=${limit}` : '';
    const response = await api.get(`/api/audit-logs/entity/${entityType}/${entityId}${params}`);
    return response.data;
  },
  
  getByTrust: async (trustId: string, limit?: number) => {
    const params = limit ? `?limit=${limit}` : '';
    const response = await api.get(`/api/audit-logs/trust/${trustId}${params}`);
    return response.data;
  },
  
  getByUser: async (actorId: string, limit?: number) => {
    const params = limit ? `?limit=${limit}` : '';
    const response = await api.get(`/api/audit-logs/user/${actorId}${params}`);
    return response.data;
  },
};

export const comiteSessionsApi = {
  create: async (data: {
    trustId: string;
    sessionDate: string;
    sessionType: 'QUARTERLY' | 'EXTRAORDINARY' | 'SPECIAL';
    location?: string;
    meetingLink?: string;
    agenda?: any;
  }) => {
    const response = await api.post('/api/comite-sessions', data);
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/api/comite-sessions/${id}`);
    return response.data;
  },
  
  list: async (filters?: {
    trustId: string;
    status?: string;
    sessionType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get(`/api/comite-sessions?${params}`);
    return response.data;
  },
  
  update: async (id: string, data: {
    sessionDate?: string;
    sessionType?: 'QUARTERLY' | 'EXTRAORDINARY' | 'SPECIAL';
    attendees?: string[];
    quorum?: boolean;
    agenda?: any;
    decisions?: any;
    approvedItems?: string[];
    minutes?: string;
    minutesUrl?: string;
    minutesHash?: string;
    status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    location?: string;
    meetingLink?: string;
  }) => {
    const response = await api.put(`/api/comite-sessions/${id}`, data);
    return response.data;
  },
  
  getNextQuarterly: async (trustId: string) => {
    const response = await api.get(`/api/comite-sessions/trust/${trustId}/next-quarterly`);
    return response.data;
  },
  
  generateQuarterly: async (trustId: string) => {
    const response = await api.post(`/api/comite-sessions/trust/${trustId}/generate-quarterly`);
    return response.data;
  },
};

export const monthlyStatementsApi = {
  create: async (data: {
    trustId: string;
    year: number;
    month: number;
    summary?: any;
    assets?: any;
    transactions?: any;
    documentUrl?: string;
    documentHash?: string;
  }) => {
    const response = await api.post('/api/monthly-statements', data);
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/api/monthly-statements/${id}`);
    return response.data;
  },
  
  list: async (filters?: {
    trustId: string;
    year?: number;
    month?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get(`/api/monthly-statements?${params}`);
    return response.data;
  },
  
  review: async (id: string, data: {
    status: 'APPROVED' | 'OBSERVED';
    observations?: string;
  }) => {
    const response = await api.put(`/api/monthly-statements/${id}/review`, data);
    return response.data;
  },
  
  generatePrevious: async (trustId: string) => {
    const response = await api.post(`/api/monthly-statements/trust/${trustId}/generate-previous`);
    return response.data;
  },
};

export const exceptionVotesApi = {
  vote: async (data: {
    assetId: string;
    vote: 'APPROVE' | 'REJECT';
    reason?: string;
  }) => {
    const response = await api.post('/api/exception-votes', data);
    return response.data;
  },
  
  getStatus: async (assetId: string) => {
    const response = await api.get(`/api/exception-votes/asset/${assetId}`);
    return response.data;
  },
};

export const assetTemplatesApi = {
  list: async (filters?: {
    assetType?: string;
    trustId?: string | null;
    isActive?: boolean;
    isDefault?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get(`/api/asset-templates?${params}`);
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get(`/api/asset-templates/${id}`);
    return response.data;
  },
  
  getDefault: async (assetType: string, trustId?: string) => {
    const params = trustId ? `?trustId=${trustId}` : '';
    const response = await api.get(`/api/asset-templates/default/${assetType}${params}`);
    return response.data;
  },
  
  create: async (data: {
    assetType: string;
    trustId?: string | null;
    name: string;
    description?: string;
    defaultFields: Record<string, any>;
    isDefault?: boolean;
  }) => {
    const response = await api.post('/api/asset-templates', data);
    return response.data;
  },
  
  update: async (id: string, data: {
    name?: string;
    description?: string;
    defaultFields?: Record<string, any>;
    isDefault?: boolean;
    isActive?: boolean;
  }) => {
    const response = await api.put(`/api/asset-templates/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/api/asset-templates/${id}`);
    return response.data;
  },
};
