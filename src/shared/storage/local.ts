import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type { Armazenamento } from './storage.js';

export class ArmazenamentoLocal implements Armazenamento {
  private readonly base: string;

  constructor(diretorio: string) {
    this.base = path.resolve(diretorio);
  }

  async salvar(chave: string, conteudo: Readable): Promise<void> {
    const destino = this.caminhoSeguro(chave);
    await mkdir(path.dirname(destino), { recursive: true });
    await pipeline(conteudo, createWriteStream(destino));
  }

  ler(chave: string): Promise<Readable> {
    return Promise.resolve(createReadStream(this.caminhoSeguro(chave)));
  }

  async remover(chave: string): Promise<void> {
    await rm(this.caminhoSeguro(chave), { force: true });
  }

  async existe(chave: string): Promise<boolean> {
    try {
      await access(this.caminhoSeguro(chave));
      return true;
    } catch {
      return false;
    }
  }

  // Guarda contra path traversal: a chave nunca pode escapar do diretório base.
  // As chaves são geradas por nós (aleatórias), mas a checagem é defesa em
  // profundidade caso uma chave venha de fora.
  private caminhoSeguro(chave: string): string {
    const resolvido = path.resolve(this.base, chave);
    if (resolvido !== this.base && !resolvido.startsWith(this.base + path.sep)) {
      throw new Error(`Chave de storage inválida: ${chave}`);
    }
    return resolvido;
  }
}
