import { fileTypeFromBuffer } from 'file-type';

// Allowlist por tipo REAL (detectado nos bytes), não por extensão ou
// Content-Type — esses o cliente controla e mente à vontade.
export const TIPOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

export interface TipoDetectado {
  mime: string;
  ext: string;
}

export async function detectarTipoPermitido(cabecalho: Buffer): Promise<TipoDetectado | null> {
  const tipo = await fileTypeFromBuffer(cabecalho);
  if (!tipo || !TIPOS_PERMITIDOS.has(tipo.mime)) {
    return null;
  }
  return { mime: tipo.mime, ext: tipo.ext };
}

export function ehImagem(mime: string): boolean {
  return mime.startsWith('image/');
}
