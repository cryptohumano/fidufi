/**
 * Servicio para emitir Verifiable Credentials (VCs)
 * 
 * Implementa el estándar W3C Verifiable Credentials
 * https://www.w3.org/TR/vc-data-model/
 */

import { Prisma } from '../generated/prisma/client';
import crypto from 'crypto';

type Asset = Prisma.AssetGetPayload<{ include: { actor: true } }>;
type Trust = Prisma.TrustGetPayload<{}>;
type Actor = Prisma.ActorGetPayload<{}>;

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: {
    id: string;
    name?: string;
  };
  issuanceDate: string;
  credentialSubject: {
    id: string;
    type: string;
    trustId: string;
    assetId: string;
    assetType: string;
    valueMxn: string;
    complianceStatus: string;
    compliant: boolean;
    registeredAt: string;
    registeredBy: string;
  };
  proof: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    jws?: string;
  };
}

/**
 * Genera un Verifiable Credential para un activo registrado
 */
export async function issueAssetVC(
  asset: Asset & { actor: Actor },
  trust: Trust
): Promise<VerifiableCredential> {
  const vcId = `did:fidufi:asset:${asset.id}`;
  const issuerId = process.env.VC_ISSUER_DID || 'did:fidufi:issuer';
  const issuanceDate = new Date().toISOString();

  const vc: VerifiableCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1',
      'https://fidufi.mx/credentials/v1',
    ],
    id: vcId,
    type: ['VerifiableCredential', 'TrustAssetRegistration'],
    issuer: {
      id: issuerId,
      name: 'fidufi - Sistema de Fideicomisos',
    },
    issuanceDate,
    credentialSubject: {
      id: `did:fidufi:asset:${asset.id}`,
      type: 'TrustAsset',
      trustId: asset.trustId,
      assetId: asset.id,
      assetType: asset.assetType,
      valueMxn: asset.valueMxn.toString(),
      complianceStatus: asset.complianceStatus,
      compliant: asset.compliant,
      registeredAt: asset.registeredAt.toISOString(),
      registeredBy: asset.registeredBy,
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: issuanceDate,
      proofPurpose: 'assertionMethod',
      verificationMethod: `${issuerId}#keys-1`,
    },
  };

  // Firmar el VC (por ahora solo generar hash, en producción usar clave privada real)
  const vcHash = hashVC(vc);
  vc.proof.jws = `v=${vcHash}`;

  return vc;
}

/**
 * Genera el hash de un VC para anclaje en blockchain
 */
export function hashVC(vc: VerifiableCredential): string {
  // Normalizar el VC (remover proof temporalmente para el hash)
  const { proof, ...vcWithoutProof } = vc;
  const normalized = JSON.stringify(vcWithoutProof, Object.keys(vcWithoutProof).sort());
  
  // Generar hash SHA-256
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Verifica la estructura de un VC
 */
export function validateVC(vc: any): boolean {
  if (!vc['@context'] || !Array.isArray(vc['@context'])) {
    return false;
  }
  
  if (!vc.id || typeof vc.id !== 'string') {
    return false;
  }
  
  if (!vc.type || !Array.isArray(vc.type)) {
    return false;
  }
  
  if (!vc.issuer || !vc.issuer.id) {
    return false;
  }
  
  if (!vc.credentialSubject) {
    return false;
  }
  
  if (!vc.proof) {
    return false;
  }
  
  return true;
}

/**
 * Serializa un VC a JSON-LD
 */
export function serializeVC(vc: VerifiableCredential): string {
  return JSON.stringify(vc, null, 2);
}
