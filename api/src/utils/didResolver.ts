/**
 * Utilidades para resolución de DIDs (Decentralized Identifiers)
 * 
 * Soporta múltiples métodos DID:
 * - did:kilt:...
 * - did:polkadot:...
 * - did:ethr:... (Ethereum)
 * - did:key:...
 */

export interface DIDDocument {
  id: string;
  '@context': string[];
  publicKey?: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyHex?: string;
    publicKeyBase58?: string;
  }>;
  authentication?: string[];
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
}

/**
 * Resuelve un DID a su documento DID
 * 
 * Por ahora es una implementación básica que valida el formato.
 * En producción, integrar con un resolver real como:
 * - Universal Resolver (https://dev.uniresolver.io/)
 * - did:kilt resolver
 * - did:polkadot resolver
 */
export async function resolveDID(did: string): Promise<DIDDocument | null> {
  if (!did || typeof did !== 'string') {
    throw new Error('DID inválido: debe ser un string');
  }

  // Validar formato básico de DID
  const didPattern = /^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/;
  if (!didPattern.test(did)) {
    throw new Error(`Formato de DID inválido: ${did}`);
  }

  // Extraer método DID
  const parts = did.split(':');
  const method = parts[1];

  // Por ahora, retornar un documento básico
  // En producción, hacer una llamada real al resolver
  const document: DIDDocument = {
    id: did,
    '@context': ['https://www.w3.org/ns/did/v1'],
    publicKey: [
      {
        id: `${did}#keys-1`,
        type: 'Ed25519VerificationKey2020',
        controller: did,
      },
    ],
    authentication: [`${did}#keys-1`],
  };

  // TODO: Integrar con resolver real según el método
  // if (method === 'kilt') {
  //   return await resolveKiltDID(did);
  // } else if (method === 'polkadot') {
  //   return await resolvePolkadotDID(did);
  // } else if (method === 'ethr') {
  //   return await resolveEthrDID(did);
  // }

  return document;
}

/**
 * Verifica una firma usando un DID
 * 
 * Por ahora es un stub. En producción, implementar verificación real
 * usando las claves públicas del DID document.
 */
export async function verifySignature(
  message: string,
  signature: string,
  did: string
): Promise<boolean> {
  try {
    // Resolver DID document
    const didDocument = await resolveDID(did);
    if (!didDocument) {
      return false;
    }

    // TODO: Implementar verificación real de firma
    // 1. Obtener clave pública del DID document
    // 2. Verificar firma usando la clave pública
    // 3. Retornar resultado

    // Por ahora, retornar true si el formato es válido
    // En producción, usar una librería como:
    // - @kiltprotocol/did
    // - @polkadot/util-crypto
    // - ethers.js para Ethereum

    return true;
  } catch (error) {
    console.error('Error verificando firma:', error);
    return false;
  }
}

/**
 * Valida que un DID tenga un formato válido
 */
export function isValidDID(did: string): boolean {
  if (!did || typeof did !== 'string') {
    return false;
  }

  const didPattern = /^did:[a-z0-9]+:[a-zA-Z0-9._-]+$/;
  return didPattern.test(did);
}

/**
 * Extrae el método DID de un DID
 */
export function getDIDMethod(did: string): string | null {
  const parts = did.split(':');
  if (parts.length < 3 || parts[0] !== 'did') {
    return null;
  }
  return parts[1];
}
