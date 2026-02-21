/**
 * Servicio para manejar plantillas de activos
 * 
 * Las plantillas permiten pre-llenar formularios de registro de activos
 * según el tipo de activo seleccionado.
 */

import { prisma } from '../lib/prisma';
import { AssetType } from '../generated/prisma/enums';
import { getActorById } from './actorService';

export interface CreateAssetTemplateData {
  assetType: AssetType;
  trustId?: string | null; // null = plantilla global
  name: string;
  description?: string;
  defaultFields: Record<string, any>; // Campos por defecto según el tipo
  isDefault?: boolean;
  createdBy: string; // Actor.id
}

export interface UpdateAssetTemplateData {
  name?: string;
  description?: string;
  defaultFields?: Record<string, any>;
  isDefault?: boolean;
  isActive?: boolean;
}

/**
 * Crea una nueva plantilla de activo
 */
export async function createAssetTemplate(data: CreateAssetTemplateData) {
  // Verificar que el creador existe
  await getActorById(data.createdBy);

  // Si se marca como default, desmarcar otras plantillas del mismo tipo y fideicomiso
  if (data.isDefault) {
    await prisma.assetTemplate.updateMany({
      where: {
        assetType: data.assetType,
        trustId: data.trustId || null,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  const template = await prisma.assetTemplate.create({
    data: {
      assetType: data.assetType,
      trustId: data.trustId || null,
      name: data.name,
      description: data.description || null,
      defaultFields: data.defaultFields,
      isDefault: data.isDefault || false,
      isActive: true,
      createdBy: data.createdBy,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      trust: {
        select: {
          trustId: true,
          name: true,
        },
      },
    },
  });

  return template;
}

/**
 * Obtiene una plantilla por ID
 */
export async function getAssetTemplateById(templateId: string) {
  const template = await prisma.assetTemplate.findUnique({
    where: { id: templateId },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      trust: {
        select: {
          trustId: true,
          name: true,
        },
      },
    },
  });

  if (!template) {
    throw new Error(`Plantilla ${templateId} no encontrada`);
  }

  return template;
}

/**
 * Lista plantillas con filtros opcionales
 */
export async function listAssetTemplates(filters?: {
  assetType?: AssetType;
  trustId?: string | null; // null = solo globales, undefined = todas
  isActive?: boolean;
  isDefault?: boolean;
}) {
  const where: any = {};

  if (filters?.assetType) {
    where.assetType = filters.assetType;
  }

  if (filters?.trustId !== undefined) {
    if (filters.trustId === null) {
      // Solo plantillas globales
      where.trustId = null;
    } else {
      // Plantillas del fideicomiso o globales
      where.OR = [
        { trustId: filters.trustId },
        { trustId: null }, // También incluir globales
      ];
    }
  }

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters?.isDefault !== undefined) {
    where.isDefault = filters.isDefault;
  }

  const templates = await prisma.assetTemplate.findMany({
    where,
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      trust: {
        select: {
          trustId: true,
          name: true,
        },
      },
    },
    orderBy: [
      { isDefault: 'desc' }, // Plantillas por defecto primero
      { name: 'asc' },
    ],
  });

  return templates;
}

/**
 * Obtiene la plantilla por defecto para un tipo de activo y fideicomiso
 * Busca primero plantillas específicas del fideicomiso, luego globales
 */
export async function getDefaultTemplate(assetType: AssetType, trustId?: string) {
  // Primero buscar plantilla específica del fideicomiso
  if (trustId) {
    const trustSpecific = await prisma.assetTemplate.findFirst({
      where: {
        assetType,
        trustId,
        isDefault: true,
        isActive: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (trustSpecific) {
      return trustSpecific;
    }
  }

  // Si no hay específica, buscar plantilla global
  const global = await prisma.assetTemplate.findFirst({
    where: {
      assetType,
      trustId: null,
      isDefault: true,
      isActive: true,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return global || null;
}

/**
 * Actualiza una plantilla
 */
export async function updateAssetTemplate(
  templateId: string,
  data: UpdateAssetTemplateData
) {
  const template = await getAssetTemplateById(templateId);

  // Si se marca como default, desmarcar otras plantillas del mismo tipo y fideicomiso
  if (data.isDefault === true) {
    await prisma.assetTemplate.updateMany({
      where: {
        assetType: template.assetType,
        trustId: template.trustId,
        id: { not: templateId },
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  const updated = await prisma.assetTemplate.update({
    where: { id: templateId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.defaultFields !== undefined && { defaultFields: data.defaultFields }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      trust: {
        select: {
          trustId: true,
          name: true,
        },
      },
    },
  });

  return updated;
}

/**
 * Elimina una plantilla (soft delete marcándola como inactiva)
 */
export async function deleteAssetTemplate(templateId: string) {
  const template = await getAssetTemplateById(templateId);

  // Soft delete: marcar como inactiva
  const deleted = await prisma.assetTemplate.update({
    where: { id: templateId },
    data: {
      isActive: false,
    },
  });

  return deleted;
}

/**
 * Aplica una plantilla a los datos de un activo
 * Combina los campos por defecto de la plantilla con los datos proporcionados
 */
export function applyTemplate(
  template: { defaultFields: any },
  existingData: Record<string, any> = {}
): Record<string, any> {
  const defaultFields = template.defaultFields as Record<string, any>;
  
  // Combinar campos por defecto con datos existentes
  // Los datos existentes tienen prioridad sobre los por defecto
  return {
    ...defaultFields,
    ...existingData,
  };
}
