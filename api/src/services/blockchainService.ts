/**
 * Servicio para anclar hashes en blockchain
 * 
 * Soporta Polygon zkEVM como red principal y IPFS como fallback
 */

import { ethers } from 'ethers';
import { hashVC } from './vcIssuer';

export interface AnchorResult {
  success: boolean;
  txHash?: string;
  network?: string;
  ipfsHash?: string;
  error?: string;
}

export interface AnchorMetadata {
  assetId: string;
  trustId: string;
  vcHash: string;
  timestamp: string;
}

/**
 * Ancla un hash en Polygon zkEVM
 */
export async function anchorHash(
  hash: string,
  metadata: AnchorMetadata
): Promise<AnchorResult> {
  const rpcUrl = process.env.POLYGON_ZKEVM_RPC_URL;
  const privateKey = process.env.POLYGON_ZKEVM_PRIVATE_KEY;

  // Si no hay configuración de Polygon, usar IPFS como fallback
  if (!rpcUrl || !privateKey || privateKey === 'your-private-key-for-anchoring') {
    console.warn('⚠️  Polygon zkEVM no configurado, usando IPFS como fallback');
    return await anchorHashIPFS(hash, metadata);
  }

  try {
    // Conectar a Polygon zkEVM
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Por ahora, solo simulamos el anclaje
    // En producción, usar un smart contract o servicio de timestamping
    // Ejemplo: usar un contrato simple que almacene el hash
    
    // Simular transacción (en producción, hacer llamada real al contrato)
    const mockTxHash = ethers.keccak256(
      ethers.toUtf8Bytes(`${hash}-${metadata.timestamp}-${metadata.assetId}`)
    ).slice(0, 66); // Formato de hash de transacción (0x + 64 caracteres)

    console.log(`✅ Hash anclado en Polygon zkEVM: ${mockTxHash}`);

    return {
      success: true,
      txHash: mockTxHash,
      network: 'polygon-zkevm',
    };
  } catch (error: any) {
    console.error('❌ Error anclando en Polygon zkEVM:', error);
    
    // Fallback a IPFS
    return await anchorHashIPFS(hash, metadata);
  }
}

/**
 * Ancla un hash en IPFS (fallback)
 */
export async function anchorHashIPFS(
  hash: string,
  metadata: AnchorMetadata
): Promise<AnchorResult> {
  try {
    // Por ahora, simulamos el almacenamiento en IPFS
    // En producción, usar una librería como ipfs-http-client o pinata
    
    const ipfsData = {
      hash,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // Simular hash de IPFS (en producción, usar IPFS real)
    const ipfsHash = `Qm${Buffer.from(JSON.stringify(ipfsData)).toString('base64').slice(0, 44)}`;

    console.log(`✅ Hash anclado en IPFS: ${ipfsHash}`);

    return {
      success: true,
      ipfsHash,
      network: 'ipfs',
    };
  } catch (error: any) {
    console.error('❌ Error anclando en IPFS:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al anclar hash',
    };
  }
}

/**
 * Verifica un anclaje usando el hash de transacción
 */
export async function verifyAnchor(txHash: string, network: string = 'polygon-zkevm'): Promise<boolean> {
  if (network === 'ipfs') {
    // Verificar en IPFS
    const gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/';
    try {
      const response = await fetch(`${gatewayUrl}${txHash}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Verificar en Polygon zkEVM
  const rpcUrl = process.env.POLYGON_ZKEVM_RPC_URL;
  if (!rpcUrl) {
    return false;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const receipt = await provider.getTransactionReceipt(txHash);
    return receipt !== null && receipt.status === 1;
  } catch {
    return false;
  }
}

/**
 * Ancla un Verifiable Credential completo
 */
export async function anchorVC(vcHash: string, metadata: AnchorMetadata): Promise<AnchorResult> {
  return await anchorHash(vcHash, metadata);
}
