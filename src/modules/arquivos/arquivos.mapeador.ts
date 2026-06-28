import type { Arquivo } from '@prisma/client';

export function apresentarArquivo(arquivo: Arquivo) {
  return {
    id: arquivo.id,
    nomeOriginal: arquivo.nomeOriginal,
    mimeType: arquivo.mimeType,
    tamanho: arquivo.tamanho,
    temThumbnail: arquivo.thumbnailChave !== null,
    criadoEm: arquivo.criadoEm,
  };
}
