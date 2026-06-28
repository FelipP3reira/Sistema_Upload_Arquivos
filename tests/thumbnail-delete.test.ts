import FormData from 'form-data';
import type { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { criarApp } from '../src/app.js';

let app: FastifyInstance;
let PNG: Buffer;

beforeAll(async () => {
  app = await criarApp();
  // Imagem real e decodificável para o sharp gerar a thumbnail.
  PNG = await sharp({
    create: { width: 16, height: 16, channels: 3, background: { r: 10, g: 120, b: 200 } },
  })
    .png()
    .toBuffer();
});

afterAll(async () => {
  await app.close();
});

const PDF = Buffer.from('%PDF-1.4\n%mini\n');

async function subir(
  conteudo: Buffer,
  nome: string,
  contentType: string,
  donoId = 'dono',
): Promise<{ id: string; temThumbnail: boolean }> {
  const form = new FormData();
  form.append('arquivo', conteudo, { filename: nome, contentType });
  const resposta = await app.inject({
    method: 'POST',
    url: '/v1/arquivos',
    headers: { ...form.getHeaders(), 'x-dono-id': donoId },
    payload: form,
  });
  const arquivo = resposta.json().arquivos[0];
  return { id: arquivo.id as string, temThumbnail: arquivo.temThumbnail as boolean };
}

describe('thumbnail', () => {
  it('gera thumbnail para imagem e serve em webp', async () => {
    const { id, temThumbnail } = await subir(PNG, 'foto.png', 'image/png');
    expect(temThumbnail).toBe(true);

    const resposta = await app.inject({
      method: 'GET',
      url: `/v1/arquivos/${id}/thumbnail`,
      headers: { 'x-dono-id': 'dono' },
    });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.headers['content-type']).toBe('image/webp');
    expect(resposta.rawPayload.length).toBeGreaterThan(0);
  });

  it('não gera thumbnail para PDF (404 ao pedir)', async () => {
    const { id, temThumbnail } = await subir(PDF, 'doc.pdf', 'application/pdf');
    expect(temThumbnail).toBe(false);

    const resposta = await app.inject({
      method: 'GET',
      url: `/v1/arquivos/${id}/thumbnail`,
      headers: { 'x-dono-id': 'dono' },
    });
    expect(resposta.statusCode).toBe(404);
  });
});

describe('exclusão', () => {
  it('o dono remove o arquivo (204) e ele some', async () => {
    const { id } = await subir(PNG, 'foto.png', 'image/png');

    const remocao = await app.inject({
      method: 'DELETE',
      url: `/v1/arquivos/${id}`,
      headers: { 'x-dono-id': 'dono' },
    });
    expect(remocao.statusCode).toBe(204);

    const depois = await app.inject({
      method: 'GET',
      url: `/v1/arquivos/${id}`,
      headers: { 'x-dono-id': 'dono' },
    });
    expect(depois.statusCode).toBe(404);
  });

  it('intruso não remove (403)', async () => {
    const { id } = await subir(PNG, 'foto.png', 'image/png');
    const resposta = await app.inject({
      method: 'DELETE',
      url: `/v1/arquivos/${id}`,
      headers: { 'x-dono-id': 'intruso' },
    });
    expect(resposta.statusCode).toBe(403);
  });
});
