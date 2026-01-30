/**
 * Servicio de estadísticas para Super Admin
 */

import { prisma } from '../lib/prisma';
import { Decimal } from '../generated/prisma/internal/prismaNamespace';

export interface AdminStats {
  totalUsers: number;
  totalAssets: number;
  totalCompliantAssetsValue: Decimal;
  usersByRole: Record<string, number>;
  activeUsersByRole: Record<string, number>;
  totalTrusts: number;
}

/**
 * Obtiene estadísticas generales del sistema para el Super Admin
 */
export async function getAdminStats(): Promise<AdminStats> {
  // Total de usuarios
  const totalUsers = await prisma.actor.count();

  // Total de activos digitalizados
  const totalAssets = await prisma.asset.count();

  // Monto total de activos que cumplen (compliant)
  const compliantAssets = await prisma.asset.findMany({
    where: {
      compliant: true,
    },
    select: {
      valueMxn: true,
    },
  });

  const totalCompliantAssetsValue = compliantAssets.reduce(
    (sum, asset) => sum.add(asset.valueMxn),
    new Decimal(0)
  );

  // Usuarios por rol
  const usersByRoleRaw = await prisma.actor.groupBy({
    by: ['role'],
    _count: {
      role: true,
    },
  });

  const usersByRole: Record<string, number> = {};
  usersByRoleRaw.forEach((item) => {
    usersByRole[item.role] = item._count.role;
  });

  // Usuarios activos por rol (con email y password, es decir, que pueden iniciar sesión)
  const activeUsersByRoleRaw = await prisma.actor.groupBy({
    by: ['role'],
    where: {
      email: { not: null },
      passwordHash: { not: null },
    },
    _count: {
      role: true,
    },
  });

  const activeUsersByRole: Record<string, number> = {};
  activeUsersByRoleRaw.forEach((item) => {
    activeUsersByRole[item.role] = item._count.role;
  });

  // Total de fideicomisos
  const totalTrusts = await prisma.trust.count();

  return {
    totalUsers,
    totalAssets,
    totalCompliantAssetsValue,
    usersByRole,
    activeUsersByRole,
    totalTrusts,
  };
}
