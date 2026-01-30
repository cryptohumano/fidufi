/**
 * Script para verificar beneficiarios en la base de datos
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || typeof databaseUrl !== 'string') {
  throw new Error('DATABASE_URL no está definida');
}

const adapter = new PrismaPg({ 
  connectionString: String(databaseUrl),
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🔍 Verificando beneficiarios en la base de datos...\n');

  const beneficiarios = await prisma.actor.findMany({
    where: {
      role: 'BENEFICIARIO',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordHash: true,
      createdAt: true,
    },
  });

  if (beneficiarios.length === 0) {
    console.log('❌ No se encontraron beneficiarios en la base de datos.');
    console.log('💡 Ejecuta: yarn prisma db seed\n');
  } else {
    console.log(`✅ Se encontraron ${beneficiarios.length} beneficiario(s):\n`);
    beneficiarios.forEach((b, index) => {
      console.log(`${index + 1}. ${b.name || 'Sin nombre'}`);
      console.log(`   Email: ${b.email || 'Sin email'}`);
      console.log(`   ID: ${b.id}`);
      console.log(`   Tiene contraseña: ${b.passwordHash ? '✅ Sí' : '❌ No'}`);
      console.log(`   Creado: ${b.createdAt.toLocaleString('es-MX')}\n`);
    });
  }

  // Verificar asignaciones al fideicomiso
  const memberships = await prisma.actorTrust.findMany({
    where: {
      roleInTrust: 'BENEFICIARIO',
      active: true,
    },
    include: {
      actor: {
        select: {
          email: true,
          name: true,
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

  if (memberships.length > 0) {
    console.log(`📋 Asignaciones al fideicomiso:\n`);
    memberships.forEach((m, index) => {
      console.log(`${index + 1}. ${m.actor.name || m.actor.email}`);
      console.log(`   Fideicomiso: ${m.trust.trustId} - ${m.trust.name || 'Sin nombre'}`);
      console.log(`   Asignado: ${m.assignedAt.toLocaleString('es-MX')}\n`);
    });
  } else {
    console.log('⚠️  No se encontraron asignaciones de beneficiarios al fideicomiso.\n');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
