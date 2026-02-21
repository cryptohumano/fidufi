/**
 * Seed script para poblar la base de datos con datos iniciales
 * 
 * IMPORTANTE: En Prisma 7, las variables de entorno deben cargarse explícitamente
 * 
 * Ejecutar con: yarn prisma db seed
 * O manualmente: tsx --env-file=.env prisma/seed.ts
 */

// Cargar variables de entorno PRIMERO (antes de cualquier import)
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

// Verificar que DATABASE_URL esté definida y sea un string válido
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || typeof databaseUrl !== 'string') {
  throw new Error(
    `DATABASE_URL no está definida o no es un string válido. ` +
    `Valor actual: ${typeof databaseUrl}. ` +
    `Asegúrate de tener un archivo .env en el directorio api/ con DATABASE_URL configurada.`
  );
}

// Crear adapter pasando connectionString directamente (más confiable que usar Pool)
const adapter = new PrismaPg({ 
  connectionString: String(databaseUrl),
});

// Usar el cliente de Prisma con adapter
const prisma = new PrismaClient({
  adapter,
  log: ['info', 'warn', 'error'],
});

// Importar Decimal desde el namespace de Prisma generado
import * as PrismaNamespace from '../src/generated/prisma/internal/prismaNamespace';
const Decimal = PrismaNamespace.Decimal;

// Importar funciones y constantes de auditoría
import { createAuditLog, AuditAction, EntityType } from '../src/services/auditLogService';

// ID especial para acciones del sistema
const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

async function main() {
  console.log('🌱 Iniciando seed de base de datos...');

  // 1. Crear el Fideicomiso 10045
  console.log('📋 Creando Fideicomiso 10045...');
  
  // Calcular fechas basadas en el contrato (firmado el 9 de agosto de 2002)
  const constitutionDate = new Date('2002-08-09');
  const maxTermYears = 30; // Plazo estándar
  const expirationDate = new Date(constitutionDate);
  expirationDate.setFullYear(expirationDate.getFullYear() + maxTermYears);
  
  const trust = await prisma.trust.upsert({
    where: { trustId: '10045' },
    update: {
      // Actualizar campos si ya existe
      constitutionDate,
      expirationDate,
      maxTermYears,
      termType: 'STANDARD',
      fideicomitenteName: 'Banco del Ahorro Nacional y Servicios Financieros, S.N.C.',
      fiduciarioName: 'Banco del Ahorro Nacional y Servicios Financieros, S.N.C. - Coordinación Fiduciaria',
    },
    create: {
      trustId: '10045',
      name: 'Fideicomiso para el Pago de Pensiones y Jubilaciones - Banco del Ahorro Nacional',
      initialCapital: new Decimal(68500000),
      bondLimitPercent: new Decimal(30),
      otherLimitPercent: new Decimal(70),
      active: true,
      // Información de partes
      fideicomitenteName: 'Banco del Ahorro Nacional y Servicios Financieros, S.N.C.',
      fiduciarioName: 'Banco del Ahorro Nacional y Servicios Financieros, S.N.C. - Coordinación Fiduciaria',
      // Plazos y vigencia
      constitutionDate,
      expirationDate,
      maxTermYears,
      termType: 'STANDARD',
      // Obligaciones fiscales (ejemplo)
      rfc: 'FID100450123ABC',
      satRegistrationNumber: 'SAT-REG-10045-2002',
      satRegisteredAt: new Date('2002-09-15'), // Registrado aproximadamente 1 mes después
    },
  });
  console.log('✅ Fideicomiso creado:', trust.trustId);

  // 2. Crear registro de honorarios del fiduciario
  console.log('💰 Creando registro de honorarios...');
  const fiduciarioFee = await prisma.fiduciarioFee.upsert({
    where: { trustId: '10045' },
    update: {},
    create: {
      trustId: '10045',
      studyFee: new Decimal(5000),
      annualFee: new Decimal(18000),
      modificationFee: new Decimal(5000),
      studyFeePaid: true, // Pagado al firmar el contrato
      allFeesPaid: false, // Pendiente de pagos mensuales
    },
  });
  console.log('✅ Honorarios configurados');

  // 3. Crear actor especial "Sistema" para logs de auditoría
  console.log('🤖 Creando actor Sistema para logs de auditoría...');
  try {
    await prisma.actor.upsert({
      where: { id: SYSTEM_ACTOR_ID },
      update: {},
      create: {
        id: SYSTEM_ACTOR_ID,
        name: 'Sistema',
        email: 'system@fidufi.mx',
        role: 'SUPER_ADMIN' as any, // Usar SUPER_ADMIN para tener acceso completo
        isSuperAdmin: true,
      },
    });
    console.log('✅ Actor Sistema creado');
  } catch (error: any) {
    console.warn('⚠️  Error creando actor Sistema:', error.message);
  }

  // 4. Crear Super Admin inicial
  console.log('👑 Creando Super Admin inicial...');
  try {
    const { hashPassword } = await import('../src/utils/password');
    const superAdminPassword = await hashPassword('admin123'); // Cambiar en producción
    
    const superAdmin = await prisma.actor.upsert({
      where: { email: 'admin@fidufi.mx' },
      update: {},
      create: {
        name: 'Super Administrador',
        email: 'admin@fidufi.mx',
        passwordHash: superAdminPassword,
        role: 'SUPER_ADMIN' as any,
        isSuperAdmin: true,
      },
    });
    console.log('✅ Super Admin creado:', superAdmin.email);

    // Log de auditoría: Creación del Super Admin
    await createAuditLog({
      actorId: SYSTEM_ACTOR_ID,
      action: AuditAction.USER_CREATED,
      entityType: EntityType.ACTOR,
      entityId: superAdmin.id,
      description: `Super Administrador creado: ${superAdmin.email}`,
      metadata: {
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.role,
      },
    });
  } catch (error: any) {
    console.warn('⚠️  Error creando Super Admin (puede que ya exista o el enum no esté actualizado):', error.message);
  }

  // 5. Crear actores de ejemplo con emails y contraseñas
  console.log('👥 Creando actores de ejemplo...');
  const { hashPassword } = await import('../src/utils/password');

  // Fiduciario
  const fiduciarioPassword = await hashPassword('fiduciario123');
  let existingFiduciario = await prisma.actor.findUnique({
    where: { email: 'fiduciario@fidufi.mx' },
  });
  if (!existingFiduciario) {
    existingFiduciario = await prisma.actor.findUnique({
      where: { primaryDid: 'did:example:fiduciario001' },
    });
  }
  const fiduciario = existingFiduciario
    ? await prisma.actor.update({
        where: { id: existingFiduciario.id },
        data: {
          email: 'fiduciario@fidufi.mx',
          passwordHash: fiduciarioPassword,
          name: 'Banco del Ahorro Nacional - Coordinación Fiduciaria',
        },
      })
    : await prisma.actor.create({
        data: {
          name: 'Banco del Ahorro Nacional - Coordinación Fiduciaria',
          email: 'fiduciario@fidufi.mx',
          passwordHash: fiduciarioPassword,
          role: 'FIDUCIARIO',
          primaryDid: 'did:example:fiduciario001',
          ethereumAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        },
      });
  console.log('✅ Fiduciario creado:', fiduciario.email);

  // Log de auditoría: Creación del Fiduciario
  await createAuditLog({
    actorId: SYSTEM_ACTOR_ID,
    action: AuditAction.USER_CREATED,
    entityType: EntityType.ACTOR,
    entityId: fiduciario.id,
    description: `Fiduciario creado: ${fiduciario.email}`,
    metadata: {
      email: fiduciario.email,
      name: fiduciario.name,
      role: fiduciario.role,
    },
  });

  // Miembros del Comité Técnico
  const comite1Password = await hashPassword('comite123');
  let existingComite1 = await prisma.actor.findUnique({
    where: { email: 'guillermo.tellez@fidufi.mx' },
  });
  if (!existingComite1) {
    existingComite1 = await prisma.actor.findUnique({
      where: { primaryDid: 'did:example:comite001' },
    });
  }
  const comite1 = existingComite1
    ? await prisma.actor.update({
        where: { id: existingComite1.id },
        data: {
          email: 'guillermo.tellez@fidufi.mx',
          passwordHash: comite1Password,
        },
      })
    : await prisma.actor.create({
        data: {
          name: 'C.P. Guillermo Téllez Gutiérrez Topete',
          email: 'guillermo.tellez@fidufi.mx',
          passwordHash: comite1Password,
          role: 'COMITE_TECNICO',
          primaryDid: 'did:example:comite001',
        },
      });

  const comite2Password = await hashPassword('comite123');
  let existingComite2 = await prisma.actor.findUnique({
    where: { email: 'octavio.ferrer@fidufi.mx' },
  });
  if (!existingComite2) {
    existingComite2 = await prisma.actor.findUnique({
      where: { primaryDid: 'did:example:comite002' },
    });
  }
  const comite2 = existingComite2
    ? await prisma.actor.update({
        where: { id: existingComite2.id },
        data: {
          email: 'octavio.ferrer@fidufi.mx',
          passwordHash: comite2Password,
        },
      })
    : await prisma.actor.create({
        data: {
          name: 'Lic. Octavio Ferrer Burgos',
          email: 'octavio.ferrer@fidufi.mx',
          passwordHash: comite2Password,
          role: 'COMITE_TECNICO',
          primaryDid: 'did:example:comite002',
        },
      });

  const comite3Password = await hashPassword('comite123');
  let existingComite3 = await prisma.actor.findUnique({
    where: { email: 'alejandro.frigolet@fidufi.mx' },
  });
  if (!existingComite3) {
    existingComite3 = await prisma.actor.findUnique({
      where: { primaryDid: 'did:example:comite003' },
    });
  }
  const comite3 = existingComite3
    ? await prisma.actor.update({
        where: { id: existingComite3.id },
        data: {
          email: 'alejandro.frigolet@fidufi.mx',
          passwordHash: comite3Password,
        },
      })
    : await prisma.actor.create({
        data: {
          name: 'Lic. Alejandro Frigolet Vázquez Vela',
          email: 'alejandro.frigolet@fidufi.mx',
          passwordHash: comite3Password,
          role: 'COMITE_TECNICO',
          primaryDid: 'did:example:comite003',
        },
      });
  console.log('✅ Comité Técnico creado (3 miembros)');

  // Logs de auditoría: Creación de miembros del Comité Técnico
  for (const member of [comite1, comite2, comite3]) {
    await createAuditLog({
      actorId: SYSTEM_ACTOR_ID,
      action: AuditAction.USER_CREATED,
      entityType: EntityType.ACTOR,
      entityId: member.id,
      description: `Miembro del Comité Técnico creado: ${member.email}`,
      metadata: {
        email: member.email,
        name: member.name,
        role: member.role,
      },
    });
  }

  // Auditor de ejemplo
  const auditorPassword = await hashPassword('auditor123');
  let existingAuditor = await prisma.actor.findUnique({
    where: { email: 'auditor@fidufi.mx' },
  });
  if (!existingAuditor) {
    existingAuditor = await prisma.actor.findUnique({
      where: { primaryDid: 'did:example:auditor001' },
    });
  }
  const auditor = existingAuditor
    ? await prisma.actor.update({
        where: { id: existingAuditor.id },
        data: {
          email: 'auditor@fidufi.mx',
          passwordHash: auditorPassword,
        },
      })
    : await prisma.actor.create({
        data: {
          name: 'Auditor Externo',
          email: 'auditor@fidufi.mx',
          passwordHash: auditorPassword,
          role: 'AUDITOR',
          primaryDid: 'did:example:auditor001',
        },
      });
  console.log('✅ Auditor creado:', auditor.email);

  // Log de auditoría: Creación del Auditor
  await createAuditLog({
    actorId: SYSTEM_ACTOR_ID,
    action: AuditAction.USER_CREATED,
    entityType: EntityType.ACTOR,
    entityId: auditor.id,
    description: `Auditor creado: ${auditor.email}`,
    metadata: {
      email: auditor.email,
      name: auditor.name,
      role: auditor.role,
    },
  });

  // Regulador de ejemplo
  const reguladorPassword = await hashPassword('regulador123');
  let existingRegulador = await prisma.actor.findUnique({
    where: { email: 'regulador@fidufi.mx' },
  });
  if (!existingRegulador) {
    existingRegulador = await prisma.actor.findUnique({
      where: { primaryDid: 'did:example:regulador001' },
    });
  }
  const regulador = existingRegulador
    ? await prisma.actor.update({
        where: { id: existingRegulador.id },
        data: {
          email: 'regulador@fidufi.mx',
          passwordHash: reguladorPassword,
        },
      })
    : await prisma.actor.create({
        data: {
          name: 'Regulador CNBV',
          email: 'regulador@fidufi.mx',
          passwordHash: reguladorPassword,
          role: 'REGULADOR',
          primaryDid: 'did:example:regulador001',
        },
      });
  console.log('✅ Regulador creado:', regulador.email);

  // Log de auditoría: Creación del Regulador
  await createAuditLog({
    actorId: SYSTEM_ACTOR_ID,
    action: AuditAction.USER_CREATED,
    entityType: EntityType.ACTOR,
    entityId: regulador.id,
    description: `Regulador creado: ${regulador.email}`,
    metadata: {
      email: regulador.email,
      name: regulador.name,
      role: regulador.role,
    },
  });

  // 4.5. Crear beneficiarios de ejemplo
  console.log('👤 Creando beneficiarios de ejemplo...');
  const beneficiario1Password = await hashPassword('beneficiario123');
  let existingBeneficiario1 = await prisma.actor.findUnique({
    where: { email: 'beneficiario1@fidufi.mx' },
  });
  const beneficiario1 = existingBeneficiario1
    ? await prisma.actor.update({
        where: { id: existingBeneficiario1.id },
        data: {
          email: 'beneficiario1@fidufi.mx',
          passwordHash: beneficiario1Password,
        },
      })
    : await prisma.actor.create({
        data: {
          name: 'Trabajador Beneficiario 1',
          email: 'beneficiario1@fidufi.mx',
          passwordHash: beneficiario1Password,
          role: 'BENEFICIARIO',
        },
      });

  const beneficiario2Password = await hashPassword('beneficiario123');
  let existingBeneficiario2 = await prisma.actor.findUnique({
    where: { email: 'beneficiario2@fidufi.mx' },
  });
  const beneficiario2 = existingBeneficiario2
    ? await prisma.actor.update({
        where: { id: existingBeneficiario2.id },
        data: {
          email: 'beneficiario2@fidufi.mx',
          passwordHash: beneficiario2Password,
        },
      })
    : await prisma.actor.create({
        data: {
          name: 'Trabajador Beneficiario 2',
          email: 'beneficiario2@fidufi.mx',
          passwordHash: beneficiario2Password,
          role: 'BENEFICIARIO',
        },
      });
  console.log('✅ Beneficiarios creados');

  // 4.6. Asignar usuarios al fideicomiso 10045
  console.log('🔗 Asignando usuarios al fideicomiso 10045...');
  const { assignActorToTrust } = await import('../src/services/actorTrustService');
  const { ActorRole } = await import('../src/generated/prisma/enums');

  // Asignar Fiduciario
  try {
    await assignActorToTrust(
      {
        actorId: fiduciario.id,
        trustId: '10045',
        roleInTrust: ActorRole.FIDUCIARIO,
      },
      SYSTEM_ACTOR_ID,
      {}
    );
    console.log('✅ Fiduciario asignado al fideicomiso');
  } catch (error: any) {
    console.warn('⚠️  Error asignando fiduciario:', error.message);
  }

  // Asignar Comité Técnico
  for (const comite of [comite1, comite2, comite3]) {
    try {
      await assignActorToTrust(
        {
          actorId: comite.id,
          trustId: '10045',
          roleInTrust: ActorRole.COMITE_TECNICO,
        },
        SYSTEM_ACTOR_ID,
        {}
      );
    } catch (error: any) {
      console.warn(`⚠️  Error asignando comité ${comite.email}:`, error.message);
    }
  }
  console.log('✅ Comité Técnico asignado al fideicomiso');

  // Asignar Auditor
  try {
    await assignActorToTrust(
      {
        actorId: auditor.id,
        trustId: '10045',
        roleInTrust: ActorRole.AUDITOR,
      },
      SYSTEM_ACTOR_ID,
      {}
    );
    console.log('✅ Auditor asignado al fideicomiso');
  } catch (error: any) {
    console.warn('⚠️  Error asignando auditor:', error.message);
  }

  // Asignar Regulador
  try {
    await assignActorToTrust(
      {
        actorId: regulador.id,
        trustId: '10045',
        roleInTrust: ActorRole.REGULADOR,
      },
      SYSTEM_ACTOR_ID,
      {}
    );
    console.log('✅ Regulador asignado al fideicomiso');
  } catch (error: any) {
    console.warn('⚠️  Error asignando regulador:', error.message);
  }

  // Asignar Beneficiarios
  for (const beneficiario of [beneficiario1, beneficiario2]) {
    try {
      await assignActorToTrust(
        {
          actorId: beneficiario.id,
          trustId: '10045',
          roleInTrust: ActorRole.BENEFICIARIO,
        },
        SYSTEM_ACTOR_ID,
        {}
      );
    } catch (error: any) {
      console.warn(`⚠️  Error asignando beneficiario ${beneficiario.email}:`, error.message);
    }
  }
  console.log('✅ Beneficiarios asignados al fideicomiso');

  // 5. Crear activos de prueba
  console.log('📊 Creando activos de prueba...');
  const { registerAsset } = await import('../src/services/assetService');
  const { AssetType } = await import('../src/generated/prisma/enums');

  // Asegurar que los honorarios estén pagados para poder registrar activos
  const updatedFiduciarioFee = await prisma.fiduciarioFee.update({
    where: { trustId: '10045' },
    data: {
      studyFeePaid: true,
      allFeesPaid: true,
    },
  });

  // Crear pagos mensuales para el año actual y el año anterior (requerido para poder registrar activos)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // Crear pagos para el año anterior completo
  for (let month = 1; month <= 12; month++) {
    const existingPayment = await prisma.monthlyFeePayment.findFirst({
      where: {
        fiduciarioFeeId: updatedFiduciarioFee.id,
        year: currentYear - 1,
        month: month,
      },
    });

    if (!existingPayment) {
      await prisma.monthlyFeePayment.create({
        data: {
          fiduciarioFeeId: updatedFiduciarioFee.id,
          year: currentYear - 1,
          month: month,
          amount: new Decimal(1500), // $18,000 anual / 12 meses
          paid: true,
          paidAt: new Date(),
        },
      });
    }
  }

  // Crear pagos para el año actual hasta el mes actual
  for (let month = 1; month <= currentMonth; month++) {
    const existingPayment = await prisma.monthlyFeePayment.findFirst({
      where: {
        fiduciarioFeeId: updatedFiduciarioFee.id,
        year: currentYear,
        month: month,
      },
    });

    if (existingPayment) {
      await prisma.monthlyFeePayment.update({
        where: { id: existingPayment.id },
        data: { paid: true, paidAt: new Date() },
      });
    } else {
      await prisma.monthlyFeePayment.create({
        data: {
          fiduciarioFeeId: updatedFiduciarioFee.id,
          year: currentYear,
          month: month,
          amount: new Decimal(1500), // $18,000 anual / 12 meses
          paid: true,
          paidAt: new Date(),
        },
      });
    }
  }
  
  console.log('✅ Pagos mensuales de honorarios configurados');

  // Activo 1: Bono gubernamental que cumple (dentro del 30%)
  try {
    const asset1 = await registerAsset({
      trustId: '10045',
      assetType: AssetType.GovernmentBond,
      valueMxn: new Decimal(15000000), // $15M (21.9% del patrimonio)
      description: 'Bonos del Gobierno Federal a 10 años',
      registeredBy: fiduciario.id,
    });
    console.log(`✅ Activo 1 creado: Bono gubernamental - ${asset1.compliant ? 'Cumple' : 'No cumple'}`);
  } catch (error: any) {
    console.warn('⚠️  Error creando activo 1:', error.message);
  }

  // Activo 2: Otro bono gubernamental (acumula ~30%)
  try {
    const asset2 = await registerAsset({
      trustId: '10045',
      assetType: AssetType.GovernmentBond,
      valueMxn: new Decimal(5500000), // $5.5M (8% adicional, total ~30%)
      description: 'CETES a 28 días',
      registeredBy: fiduciario.id,
    });
    console.log(`✅ Activo 2 creado: CETES - ${asset2.compliant ? 'Cumple' : 'No cumple'}`);
  } catch (error: any) {
    console.warn('⚠️  Error creando activo 2:', error.message);
  }

  // Activo 3: Préstamo hipotecario que cumple
  try {
    const asset3 = await registerAsset({
      trustId: '10045',
      assetType: AssetType.MortgageLoan,
      valueMxn: new Decimal(2000000), // $2M
      description: 'Préstamo hipotecario vivienda social - Trabajador #001',
      registeredBy: fiduciario.id,
      mortgageData: {
        price: new Decimal(800000), // $800k (menos de 10x salario mínimo anual)
        loanAmount: new Decimal(2000000),
        termYears: 15,
        monthlyPayment: new Decimal(15000),
        hasMortgageGuarantee: true,
        hasLifeInsurance: true,
        hasFireInsurance: true,
        interestRate: new Decimal(0.08), // 8%
        areaMinimumWage: new Decimal(80000), // $80k anual
        maxBondYieldRate: new Decimal(0.06), // 6% rendimiento máximo de bonos
      },
    });
    console.log(`✅ Activo 3 creado: Préstamo hipotecario - ${asset3.compliant ? 'Cumple' : 'No cumple'}`);
  } catch (error: any) {
    console.warn('⚠️  Error creando activo 3:', error.message);
  }

  // Activo 4: Valores aprobados por CNBV
  try {
    const asset4 = await registerAsset({
      trustId: '10045',
      assetType: AssetType.CNBVApproved,
      valueMxn: new Decimal(25000000), // $25M
      description: 'Fondos de inversión aprobados por CNBV',
      registeredBy: comite1.id,
    });
    console.log(`✅ Activo 4 creado: Valores CNBV - ${asset4.compliant ? 'Cumple' : 'No cumple'}`);
  } catch (error: any) {
    console.warn('⚠️  Error creando activo 4:', error.message);
  }

  // Activo 5: Reserva de seguros
  try {
    const asset5 = await registerAsset({
      trustId: '10045',
      assetType: AssetType.InsuranceReserve,
      valueMxn: new Decimal(10000000), // $10M
      description: 'Reserva técnica de seguros de vida',
      registeredBy: fiduciario.id,
    });
    console.log(`✅ Activo 5 creado: Reserva de seguros - ${asset5.compliant ? 'Cumple' : 'No cumple'}`);
  } catch (error: any) {
    console.warn('⚠️  Error creando activo 5:', error.message);
  }

  // Activo 6: Bono que excede el límite (NO CUMPLE - para probar alertas)
  try {
    const asset6 = await registerAsset({
      trustId: '10045',
      assetType: AssetType.GovernmentBond,
      valueMxn: new Decimal(10000000), // $10M adicionales (excedería el 30%)
      description: 'Bono adicional que excede límite del 30%',
      registeredBy: comite2.id,
    });
    console.log(`✅ Activo 6 creado: Bono excedente - ${asset6.compliant ? 'Cumple' : 'No cumple'} (esperado: No cumple)`);
  } catch (error: any) {
    console.warn('⚠️  Error creando activo 6 (esperado si excede límite):', error.message);
  }

  // Activo 7: Préstamo hipotecario que NO cumple (precio excede 10x salario mínimo)
  try {
    const asset7 = await registerAsset({
      trustId: '10045',
      assetType: AssetType.MortgageLoan,
      valueMxn: new Decimal(3000000),
      description: 'Préstamo hipotecario - Precio excede límite',
      registeredBy: fiduciario.id,
      mortgageData: {
        price: new Decimal(1200000), // $1.2M (más de 10x $80k = $800k)
        loanAmount: new Decimal(3000000),
        termYears: 20,
        monthlyPayment: new Decimal(20000),
        hasMortgageGuarantee: true,
        hasLifeInsurance: true,
        hasFireInsurance: true,
        interestRate: new Decimal(0.09),
        areaMinimumWage: new Decimal(80000),
        maxBondYieldRate: new Decimal(0.06),
      },
    });
    console.log(`✅ Activo 7 creado: Préstamo excedente - ${asset7.compliant ? 'Cumple' : 'No cumple'} (esperado: No cumple)`);
  } catch (error: any) {
    console.warn('⚠️  Error creando activo 7 (esperado si no cumple reglas):', error.message);
  }

  // Activo 8: Vivienda social
  try {
    const asset8 = await registerAsset({
      trustId: '10045',
      assetType: AssetType.SocialHousing,
      valueMxn: new Decimal(5000000), // $5M
      description: 'Adquisición de vivienda social para trabajadores',
      registeredBy: comite3.id,
    });
    console.log(`✅ Activo 8 creado: Vivienda social - ${asset8.compliant ? 'Cumple' : 'No cumple'}`);
  } catch (error: any) {
    console.warn('⚠️  Error creando activo 8:', error.message);
  }

  // Activos con estados específicos para probar filtros
  console.log('📋 Creando activos con estados específicos de cumplimiento...');
  const { ComplianceStatus } = await import('../src/generated/prisma/enums');

  // Activo 9: PENDIENTE DE REVISIÓN (requiere aprobación del Comité Técnico)
  // Este activo excede límites pero está pendiente de revisión
  try {
    const asset9 = await prisma.asset.create({
      data: {
        trustId: '10045',
        assetType: AssetType.GovernmentBond,
        valueMxn: new Decimal(25000000), // $25M (excedería el límite del 30%)
        description: 'Bono gubernamental pendiente de revisión por Comité Técnico - Excede límite del 30%',
        complianceStatus: ComplianceStatus.PENDING_REVIEW,
        compliant: false,
        validationResults: {
          investmentRules: [{
            compliant: false,
            status: 'PENDING_REVIEW',
            message: 'Excede el límite del 30% para bonos gubernamentales. Requiere aprobación del Comité Técnico.',
            details: { currentPercent: 36.5, limit: 30 },
          }],
        } as any,
        registeredBy: fiduciario.id,
      },
    });
    console.log(`✅ Activo 9 creado: Estado PENDING_REVIEW - Requiere aprobación del Comité Técnico`);

    // Log de auditoría: Activo creado con estado PENDING_REVIEW
    await createAuditLog({
      actorId: fiduciario.id,
      action: AuditAction.ASSET_REGISTERED,
      entityType: EntityType.ASSET,
      entityId: asset9.id,
      trustId: '10045',
      description: `Activo registrado con estado PENDING_REVIEW: ${asset9.description}`,
      metadata: {
        assetType: asset9.assetType,
        valueMxn: asset9.valueMxn.toNumber(),
        complianceStatus: asset9.complianceStatus,
        compliant: asset9.compliant,
      },
    });
  } catch (error: any) {
    console.warn('⚠️  Error creando activo 9:', error.message);
  }

  // Activo 10: EXCEPCIÓN APROBADA (aprobado por Comité Técnico)
  // Este activo excede límites pero fue aprobado como excepción
  try {
    const asset10 = await prisma.asset.create({
      data: {
        trustId: '10045',
        assetType: AssetType.CNBVApproved,
        valueMxn: new Decimal(50000000), // $50M (excedería el límite del 70%)
        description: 'Fondo de inversión aprobado como excepción por Comité Técnico - Excede límite del 70%',
        complianceStatus: ComplianceStatus.EXCEPTION_APPROVED,
        compliant: true, // Aunque excede límites, está aprobado como excepción
        validationResults: {
          investmentRules: [{
            compliant: true,
            status: 'EXCEPTION_APPROVED',
            message: 'Excepción aprobada por mayoría del Comité Técnico el 15/01/2026',
            details: { 
              approvedBy: [comite1.id, comite2.id, comite3.id],
              approvedAt: new Date('2026-01-15').toISOString(),
              reason: 'Oportunidad de inversión estratégica con alto rendimiento',
            },
          }],
        } as any,
        registeredBy: fiduciario.id,
      },
    });
    console.log(`✅ Activo 10 creado: Estado EXCEPTION_APPROVED - Aprobado por Comité Técnico`);

    // Log de auditoría: Activo creado con estado EXCEPTION_APPROVED
    await createAuditLog({
      actorId: fiduciario.id,
      action: AuditAction.ASSET_REGISTERED,
      entityType: EntityType.ASSET,
      entityId: asset10.id,
      trustId: '10045',
      description: `Activo registrado con estado EXCEPTION_APPROVED: ${asset10.description}`,
      metadata: {
        assetType: asset10.assetType,
        valueMxn: asset10.valueMxn.toNumber(),
        complianceStatus: asset10.complianceStatus,
        compliant: asset10.compliant,
      },
    });

    // Log de auditoría: Excepción aprobada por Comité Técnico
    await createAuditLog({
      actorId: comite1.id,
      action: AuditAction.EXCEPTION_APPROVED,
      entityType: EntityType.ASSET,
      entityId: asset10.id,
      trustId: '10045',
      description: `Excepción aprobada para activo: ${asset10.description}`,
      metadata: {
        approvedBy: [comite1.id, comite2.id, comite3.id],
        approvedAt: new Date('2026-01-15').toISOString(),
        reason: 'Oportunidad de inversión estratégica con alto rendimiento',
      },
    });
  } catch (error: any) {
    console.warn('⚠️  Error creando activo 10:', error.message);
  }

  // Activo 11: NO CUMPLIENTE (rechazado o no corregido)
  try {
    const asset11 = await prisma.asset.create({
      data: {
        trustId: '10045',
        assetType: AssetType.MortgageLoan,
        valueMxn: new Decimal(5000000),
        description: 'Préstamo hipotecario NO CUMPLIENTE - Plazo fuera de rango (25 años)',
        complianceStatus: ComplianceStatus.NON_COMPLIANT,
        compliant: false,
        validationResults: {
          mortgageRules: [{
            compliant: false,
            status: 'NON_COMPLIANT',
            message: 'El plazo del préstamo (25 años) excede el límite permitido (10-20 años)',
            details: { termYears: 25, minTerm: 10, maxTerm: 20 },
          }],
        } as any,
        registeredBy: fiduciario.id,
        beneficiaryId: beneficiario1.id,
      },
    });
    console.log(`✅ Activo 11 creado: Estado NON_COMPLIANT - No cumple reglas`);

    // Log de auditoría: Activo creado con estado NON_COMPLIANT
    await createAuditLog({
      actorId: fiduciario.id,
      action: AuditAction.ASSET_REGISTERED,
      entityType: EntityType.ASSET,
      entityId: asset11.id,
      trustId: '10045',
      description: `Activo registrado con estado NON_COMPLIANT: ${asset11.description}`,
      metadata: {
        assetType: asset11.assetType,
        valueMxn: asset11.valueMxn.toNumber(),
        complianceStatus: asset11.complianceStatus,
        compliant: asset11.compliant,
      },
    });
  } catch (error: any) {
    console.warn('⚠️  Error creando activo 11:', error.message);
  }

  // Activo 12: Otro PENDIENTE DE REVISIÓN (préstamo con condiciones especiales)
  try {
    const asset12 = await prisma.asset.create({
      data: {
        trustId: '10045',
        assetType: AssetType.MortgageLoan,
        valueMxn: new Decimal(3500000),
        description: 'Préstamo hipotecario pendiente de revisión - Requiere aprobación de condiciones especiales',
        complianceStatus: ComplianceStatus.PENDING_REVIEW,
        compliant: false,
        validationResults: {
          mortgageRules: [{
            compliant: false,
            status: 'PENDING_REVIEW',
            message: 'Préstamo requiere aprobación del Comité Técnico por condiciones especiales',
            details: { 
              reason: 'Tasa de interés ligeramente superior al máximo permitido, pero con garantías adicionales',
            },
          }],
        } as any,
        registeredBy: fiduciario.id,
        beneficiaryId: beneficiario2.id,
      },
    });
    console.log(`✅ Activo 12 creado: Estado PENDING_REVIEW - Préstamo con condiciones especiales`);

    // Log de auditoría: Activo creado con estado PENDING_REVIEW
    await createAuditLog({
      actorId: fiduciario.id,
      action: AuditAction.ASSET_REGISTERED,
      entityType: EntityType.ASSET,
      entityId: asset12.id,
      trustId: '10045',
      description: `Activo registrado con estado PENDING_REVIEW: ${asset12.description}`,
      metadata: {
        assetType: asset12.assetType,
        valueMxn: asset12.valueMxn.toNumber(),
        complianceStatus: asset12.complianceStatus,
        compliant: asset12.compliant,
      },
    });
  } catch (error: any) {
    console.warn('⚠️  Error creando activo 12:', error.message);
  }

  console.log('📝 NOTA: Los activos con estado PENDING_REVIEW y EXCEPTION_APPROVED requieren aprobación del COMITE_TECNICO');
  
  // 10. Crear plantillas de activos por defecto
  console.log('📝 Creando plantillas de activos por defecto...');
  
  // Obtener el Super Admin para usar como creador
  const superAdminForTemplates = await prisma.actor.findUnique({
    where: { email: 'admin@fidufi.mx' },
  });

  if (superAdminForTemplates) {
    // Plantilla global para Bonos Gubernamentales
    await prisma.assetTemplate.upsert({
      where: {
        assetType_trustId_name: {
          assetType: 'GovernmentBond',
          trustId: null,
          name: 'Bono Gubernamental Estándar',
        },
      },
      update: {},
      create: {
        assetType: 'GovernmentBond',
        trustId: null, // Plantilla global
        name: 'Bono Gubernamental Estándar',
        description: 'Plantilla por defecto para bonos gubernamentales federales',
        defaultFields: {
          description: 'Bono del Gobierno Federal inscrito en el Registro Nacional de Valores',
        },
        isDefault: true,
        isActive: true,
        createdBy: superAdminForTemplates.id,
      },
    });
    console.log('✅ Plantilla creada: Bono Gubernamental Estándar');

    // Plantilla global para Préstamos Hipotecarios
    await prisma.assetTemplate.upsert({
      where: {
        assetType_trustId_name: {
          assetType: 'MortgageLoan',
          trustId: null,
          name: 'Préstamo Hipotecario Vivienda Social',
        },
      },
      update: {},
      create: {
        assetType: 'MortgageLoan',
        trustId: null,
        name: 'Préstamo Hipotecario Vivienda Social',
        description: 'Plantilla por defecto para préstamos hipotecarios de vivienda social',
        defaultFields: {
          description: 'Préstamo hipotecario para vivienda de interés social',
          mortgageData: {
            termYears: 15, // Plazo estándar entre 10-20 años
            hasMortgageGuarantee: true,
            hasLifeInsurance: true,
            hasFireInsurance: true,
            interestRate: 8.5, // Tasa de interés estándar
          },
        },
        isDefault: true,
        isActive: true,
        createdBy: superAdminForTemplates.id,
      },
    });
    console.log('✅ Plantilla creada: Préstamo Hipotecario Vivienda Social');

    // Plantilla global para Reservas de Seguros
    await prisma.assetTemplate.upsert({
      where: {
        assetType_trustId_name: {
          assetType: 'InsuranceReserve',
          trustId: null,
          name: 'Reserva de Seguros Estándar',
        },
      },
      update: {},
      create: {
        assetType: 'InsuranceReserve',
        trustId: null,
        name: 'Reserva de Seguros Estándar',
        description: 'Plantilla por defecto para reservas técnicas de seguros',
        defaultFields: {
          description: 'Reserva técnica aprobada por CNBV para instituciones de seguros',
        },
        isDefault: true,
        isActive: true,
        createdBy: superAdminForTemplates.id,
      },
    });
    console.log('✅ Plantilla creada: Reserva de Seguros Estándar');

    // Plantilla específica del fideicomiso 10045 para Bonos
    await prisma.assetTemplate.upsert({
      where: {
        assetType_trustId_name: {
          assetType: 'GovernmentBond',
          trustId: '10045',
          name: 'Bono Gubernamental - Fideicomiso 10045',
        },
      },
      update: {},
      create: {
        assetType: 'GovernmentBond',
        trustId: '10045',
        name: 'Bono Gubernamental - Fideicomiso 10045',
        description: 'Plantilla específica para bonos del fideicomiso 10045',
        defaultFields: {
          description: 'Bono del Gobierno Federal para Fideicomiso de Pensiones y Jubilaciones - Banco del Ahorro Nacional',
        },
        isDefault: true,
        isActive: true,
        createdBy: superAdminForTemplates.id,
      },
    });
    console.log('✅ Plantilla creada: Bono Gubernamental - Fideicomiso 10045');
  } else {
    console.warn('⚠️  No se encontró Super Admin, omitiendo creación de plantillas');
  }
  
  // Log final: Seed completado
  console.log('📋 Creando logs de auditoría iniciales...');
  await createAuditLog({
    actorId: SYSTEM_ACTOR_ID,
    action: AuditAction.RULE_MODIFIED,
    entityType: EntityType.RULE_MODIFICATION,
    trustId: '10045',
    description: 'Seed de base de datos completado exitosamente',
    metadata: {
      seedCompletedAt: new Date().toISOString(),
      trustsCreated: 1,
      actorsCreated: 10,
      assetsCreated: 12,
    },
  });
  
  console.log('✅ Logs de auditoría iniciales creados');
  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
