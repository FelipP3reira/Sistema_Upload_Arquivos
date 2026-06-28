import type { Readable } from 'node:stream';

export interface Armazenamento {
  salvar(chave: string, conteudo: Readable, mimeType: string): Promise<void>;
  ler(chave: string): Promise<Readable>;
  remover(chave: string): Promise<void>;
  existe(chave: string): Promise<boolean>;
}
