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

describe('documentação OpenAPI', () => {
  it('expõe o documento em /docs.json com os caminhos principais', async () => {
    const resposta = await app.inject({ method: 'GET', url: '/docs.json' });

    expect(resposta.statusCode).toBe(200);
    const doc = resposta.json();
    expect(doc.openapi).toBe('3.0.3');
    expect(doc.paths['/v1/arquivos']).toBeDefined();
    expect(doc.paths['/v1/arquivos/{id}/conteudo']).toBeDefined();
    expect(doc.components.schemas.Arquivo).toBeDefined();
  });

  it('serve a página do Swagger UI em /docs', async () => {
    const resposta = await app.inject({ method: 'GET', url: '/docs/' });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.body).toContain('swagger');
  });
});
