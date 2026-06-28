import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ArmazenamentoLocal } from '../src/shared/storage/local.js';

let base: string;
let storage: ArmazenamentoLocal;

beforeAll(() => {
  base = mkdtempSync(path.join(tmpdir(), 'upload-storage-'));
  storage = new ArmazenamentoLocal(base);
});

afterAll(() => {
  rmSync(base, { recursive: true, force: true });
});

async function lerTudo(stream: Readable): Promise<string> {
  const pedacos: Buffer[] = [];
  for await (const pedaco of stream) {
    pedacos.push(Buffer.from(pedaco as Buffer));
  }
  return Buffer.concat(pedacos).toString();
}

describe('armazenamento local', () => {
  it('salva, lê de volta e remove', async () => {
    await storage.salvar('arq/aleatorio', Readable.from('conteúdo do arquivo'), 'text/plain');

    expect(await storage.existe('arq/aleatorio')).toBe(true);
    expect(await lerTudo(await storage.ler('arq/aleatorio'))).toBe('conteúdo do arquivo');

    await storage.remover('arq/aleatorio');
    expect(await storage.existe('arq/aleatorio')).toBe(false);
  });

  it('barra path traversal na chave', async () => {
    await expect(storage.salvar('../fora', Readable.from('x'), 'text/plain')).rejects.toThrow(
      /inválida/,
    );
  });
});
