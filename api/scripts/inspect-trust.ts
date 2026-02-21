/**
 * Inspecciona qué se guardó en la BD para un fideicomiso.
 *
 * Uso (desde api/): npx tsx scripts/inspect-trust.ts [trustId]
 * Ejemplo: npx tsx scripts/inspect-trust.ts 2026-0009
 *
 * Alternativa por API (con token): GET /api/trusts/:trustId
 *   curl -s -H "Authorization: Bearer <token>" http://localhost:3001/api/trusts/2026-0009 | jq
 */
import { prisma } from '../src/lib/prisma';

const trustId = process.argv[2] || '2026-0009';

async function main() {
  const trust = await prisma.trust.findUnique({
    where: { trustId },
    include: { trustTypeRef: true },
  });
  if (!trust) {
    console.log('No se encontró fideicomiso con trustId:', trustId);
    process.exit(1);
  }
  console.log('--- Trust en BD ---');
  console.log(JSON.stringify({
    trustId: trust.trustId,
    name: trust.name,
    trustTypeId: trust.trustTypeId,
    trustTypeRef: trust.trustTypeRef ? { id: trust.trustTypeRef.id, code: trust.trustTypeRef.code, name: trust.trustTypeRef.name } : null,
    baseCurrency: trust.baseCurrency,
    initialCapital: trust.initialCapital?.toString(),
    bondLimitPercent: trust.bondLimitPercent?.toString(),
    otherLimitPercent: trust.otherLimitPercent?.toString(),
    trustTypeConfig: trust.trustTypeConfig,
    status: trust.status,
    active: trust.active,
  }, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
