import type { Arquivo } from '@prisma/client';

import { ErroNaoEncontrado, ErroProibido } from '../../shared/erros/erros-aplicacao.js';
import { prisma } from '../../shared/prisma/cliente.js';
import { armazenamento } from '../../shared/storage/index.js';
import { montarUrlAssinada } from '../../shared/url/url-assinada.js';

export async function buscarArquivo(id: string): Promise<Arquivo> {
  const arquivo = await prisma.arquivo.findUnique({ where: { id } });
  if (!arquivo) {
    throw new ErroNaoEncontrado('Arquivo não encontrado.');
  }
  return arquivo;
}

export function garantirDono(arquivo: Arquivo, donoId: string): void {
  if (arquivo.donoId !== donoId) {
    throw new ErroProibido('Você não é o dono deste arquivo.');
  }
}

export async function gerarUrlAssinada(
  id: string,
  donoId: string,
  expiraEmSegundos: number,
): Promise<string> {
  const arquivo = await buscarArquivo(id);
  garantirDono(arquivo, donoId);
  return montarUrlAssinada(arquivo.id, expiraEmSegundos);
}

export async function removerArquivo(id: string, donoId: string): Promise<void> {
  const arquivo = await buscarArquivo(id);
  garantirDono(arquivo, donoId);

  await armazenamento.remover(arquivo.chave);
  if (arquivo.thumbnailChave) {
    await armazenamento.remover(arquivo.thumbnailChave);
  }
  await prisma.arquivo.delete({ where: { id: arquivo.id } });
}
