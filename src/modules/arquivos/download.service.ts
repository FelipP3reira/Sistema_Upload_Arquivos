import type { Readable } from 'node:stream';

import type { Arquivo } from '@prisma/client';

import { ErroNaoAutorizado, ErroProibido } from '../../shared/erros/erros-aplicacao.js';
import { armazenamento } from '../../shared/storage/index.js';
import { assinaturaValida } from '../../shared/url/url-assinada.js';
import { buscarArquivo } from './arquivos.service.js';

export interface AcessoConteudo {
  expira?: number;
  assinatura?: string;
  donoId?: string;
}

export async function obterParaDownload(
  id: string,
  acesso: AcessoConteudo,
): Promise<{ arquivo: Arquivo; stream: Readable }> {
  const arquivo = await buscarArquivo(id);
  autorizarAcesso(arquivo, acesso);
  const stream = await armazenamento.ler(arquivo.chave);
  return { arquivo, stream };
}

// Dois caminhos de acesso: URL assinada válida (acesso temporário, sem precisar
// ser o dono) ou o próprio dono via header.
function autorizarAcesso(arquivo: Arquivo, acesso: AcessoConteudo): void {
  if (acesso.assinatura !== undefined && acesso.expira !== undefined) {
    if (assinaturaValida(arquivo.id, acesso.expira, acesso.assinatura)) {
      return;
    }
    throw new ErroNaoAutorizado('Assinatura inválida ou expirada.');
  }

  if (acesso.donoId !== undefined) {
    if (acesso.donoId === arquivo.donoId) {
      return;
    }
    throw new ErroProibido('Você não é o dono deste arquivo.');
  }

  throw new ErroNaoAutorizado('Acesso negado: use o header x-dono-id do dono ou uma URL assinada.');
}
