import type { Arquivo } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

import { ErroValidacao } from '../../shared/erros/erros-aplicacao.js';
import { obterDonoId } from '../../shared/http/dono.js';
import { apresentarArquivo } from './arquivos.mapeador.js';
import { armazenarArquivo } from './upload.service.js';

export function arquivosRotas(app: FastifyInstance): void {
  app.post(
    '/',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const donoId = obterDonoId(request);

      const salvos: Arquivo[] = [];
      for await (const parte of request.files()) {
        salvos.push(await armazenarArquivo(donoId, parte));
      }

      if (salvos.length === 0) {
        throw new ErroValidacao('Envie ao menos um arquivo.');
      }

      return reply.status(201).send({ arquivos: salvos.map(apresentarArquivo) });
    },
  );
}
