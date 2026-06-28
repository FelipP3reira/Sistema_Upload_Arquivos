import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';

import { config } from './config/env.js';
import { arquivosRotas } from './modules/arquivos/arquivos.rotas.js';
import { registrarTratamentoDeErro } from './shared/http/erro-handler.js';
import { montarCorpoErro } from './shared/http/resposta-erro.js';

export async function criarApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(helmet);
  await app.register(multipart, {
    limits: { fileSize: config.TAMANHO_MAX_BYTES, files: 10 },
  });

  if (config.NODE_ENV !== 'test') {
    await app.register(rateLimit, {
      global: false,
      errorResponseBuilder: (_request, contexto) =>
        montarCorpoErro(
          'LIMITE_EXCEDIDO',
          `Muitas requisições. Tente de novo em ${Math.ceil(contexto.ttl / 1000)}s.`,
        ),
    });
  }

  registrarTratamentoDeErro(app);

  app.get('/health', () => ({ status: 'ok' }));

  await app.register(arquivosRotas, { prefix: '/v1/arquivos' });

  return app;
}
