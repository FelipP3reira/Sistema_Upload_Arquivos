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

async function subirArquivo(donoId = 'usuario-1'): Promise<string> {
  const form = new FormData();
  form.append('arquivo', PNG_1X1, { filename: 'foto.png', contentType: 'image/png' });
  const resposta = await app.inject({
    method: 'POST',
    url: '/v1/arquivos',
    headers: { ...form.getHeaders(), 'x-dono-id': donoId },
    payload: form,
  });
  return resposta.json().arquivos[0].id as string;
}

describe('metadados e permissão', () => {
  it('o dono lê os metadados (200)', async () => {
    const id = await subirArquivo('dono');
    const resposta = await app.inject({
      method: 'GET',
      url: `/v1/arquivos/${id}`,
      headers: { 'x-dono-id': 'dono' },
    });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().nomeOriginal).toBe('foto.png');
  });

  it('quem não é dono recebe 403', async () => {
    const id = await subirArquivo('dono');
    const resposta = await app.inject({
      method: 'GET',
      url: `/v1/arquivos/${id}`,
      headers: { 'x-dono-id': 'intruso' },
    });
    expect(resposta.statusCode).toBe(403);
  });

  it('sem identidade recebe 401', async () => {
    const id = await subirArquivo();
    const resposta = await app.inject({ method: 'GET', url: `/v1/arquivos/${id}` });
    expect(resposta.statusCode).toBe(401);
  });
});

describe('download de conteúdo', () => {
  it('o dono baixa os bytes com o mime certo', async () => {
    const id = await subirArquivo('dono');
    const resposta = await app.inject({
      method: 'GET',
      url: `/v1/arquivos/${id}/conteudo`,
      headers: { 'x-dono-id': 'dono' },
    });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.headers['content-type']).toBe('image/png');
    expect(resposta.rawPayload.equals(PNG_1X1)).toBe(true);
  });

  it('sem dono e sem assinatura recebe 401', async () => {
    const id = await subirArquivo('dono');
    const resposta = await app.inject({ method: 'GET', url: `/v1/arquivos/${id}/conteudo` });
    expect(resposta.statusCode).toBe(401);
  });
});

describe('URL assinada', () => {
  it('gera URL e libera o download sem header, mas recusa assinatura adulterada', async () => {
    const id = await subirArquivo('dono');

    const gerada = await app.inject({
      method: 'POST',
      url: `/v1/arquivos/${id}/url-assinada`,
      headers: { 'x-dono-id': 'dono' },
      payload: { expiraEmSegundos: 120 },
    });
    expect(gerada.statusCode).toBe(200);

    const url = new URL(gerada.json().url as string);
    const caminhoAssinado = `${url.pathname}${url.search}`;

    const ok = await app.inject({ method: 'GET', url: caminhoAssinado });
    expect(ok.statusCode).toBe(200);
    expect(ok.rawPayload.equals(PNG_1X1)).toBe(true);

    const adulterada = await app.inject({ method: 'GET', url: `${caminhoAssinado}xx` });
    expect(adulterada.statusCode).toBe(401);
  });

  it('só o dono gera a URL assinada (403 para intruso)', async () => {
    const id = await subirArquivo('dono');
    const resposta = await app.inject({
      method: 'POST',
      url: `/v1/arquivos/${id}/url-assinada`,
      headers: { 'x-dono-id': 'intruso' },
      payload: {},
    });
    expect(resposta.statusCode).toBe(403);
  });
});
