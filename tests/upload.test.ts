import FormData from 'form-data';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { criarApp } from '../src/app.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await criarApp();
});

afterAll(async () => {
  await app.close();
});

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

async function enviar(
  arquivos: { conteudo: Buffer; nome: string; contentType: string }[],
  donoId = 'usuario-1',
) {
  const form = new FormData();
  for (const arquivo of arquivos) {
    form.append('arquivo', arquivo.conteudo, {
      filename: arquivo.nome,
      contentType: arquivo.contentType,
    });
  }
  return app.inject({
    method: 'POST',
    url: '/v1/arquivos',
    headers: { ...form.getHeaders(), 'x-dono-id': donoId },
    payload: form,
  });
}

describe('upload de arquivos', () => {
  it('aceita um PNG válido e guarda nome aleatório com o original como metadado', async () => {
    const resposta = await enviar([
      { conteudo: PNG_1X1, nome: 'minha-foto.png', contentType: 'image/png' },
    ]);

    expect(resposta.statusCode).toBe(201);
    const arquivo = resposta.json().arquivos[0];
    expect(arquivo.mimeType).toBe('image/png');
    expect(arquivo.nomeOriginal).toBe('minha-foto.png');
    expect(arquivo.tamanho).toBe(PNG_1X1.length);
    expect(arquivo.id).toBeTypeOf('string');
  });

  it('aceita upload múltiplo', async () => {
    const resposta = await enviar([
      { conteudo: PNG_1X1, nome: 'a.png', contentType: 'image/png' },
      { conteudo: PNG_1X1, nome: 'b.png', contentType: 'image/png' },
    ]);

    expect(resposta.statusCode).toBe(201);
    expect(resposta.json().arquivos).toHaveLength(2);
  });

  it('recusa tipo proibido mesmo com extensão/Content-Type mentindo (415)', async () => {
    // Bytes de ZIP, mas enviado como "documento.pdf" image/png.
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
    const resposta = await enviar([
      { conteudo: zip, nome: 'documento.pdf', contentType: 'image/png' },
    ]);

    expect(resposta.statusCode).toBe(415);
    expect(resposta.json().erro.codigo).toBe('TIPO_NAO_PERMITIDO');
  });

  it('recusa magic byte falso: texto disfarçado de PNG (415)', async () => {
    const texto = Buffer.from('isto não é uma imagem, é texto puro');
    const resposta = await enviar([
      { conteudo: texto, nome: 'foto.png', contentType: 'image/png' },
    ]);

    expect(resposta.statusCode).toBe(415);
  });

  it('recusa arquivo acima do limite de tamanho (413)', async () => {
    // PDF de verdade (%PDF) acima de 1 KB (limite dos testes).
    const pdfGrande = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(2000, 0x41)]);
    const resposta = await enviar([
      { conteudo: pdfGrande, nome: 'grande.pdf', contentType: 'application/pdf' },
    ]);

    expect(resposta.statusCode).toBe(413);
    expect(resposta.json().erro.codigo).toBe('TAMANHO_EXCEDIDO');
  });

  it('exige o header x-dono-id (401)', async () => {
    const form = new FormData();
    form.append('arquivo', PNG_1X1, { filename: 'a.png', contentType: 'image/png' });
    const resposta = await app.inject({
      method: 'POST',
      url: '/v1/arquivos',
      headers: form.getHeaders(),
      payload: form,
    });

    expect(resposta.statusCode).toBe(401);
  });
});
