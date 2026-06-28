import type { Arquivo } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { ErroValidacao } from '../../shared/erros/erros-aplicacao.js';
import { obterDonoId } from '../../shared/http/dono.js';
import { apresentarArquivo } from './arquivos.mapeador.js';
import {
  buscarArquivo,
  garantirDono,
  gerarUrlAssinada,
  removerArquivo,
} from './arquivos.service.js';
import { obterParaDownload, obterThumbnail } from './download.service.js';
import { armazenarArquivo } from './upload.service.js';

const idParamSchema = z.object({ id: z.string().uuid('Identificador inválido.') });

const conteudoQuerySchema = z.object({
  expira: z.coerce.number().optional(),
  assinatura: z.string().optional(),
});

const urlAssinadaBodySchema = z.object({
  expiraEmSegundos: z.coerce.number().int().positive().max(86_400).default(300),
});

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

  app.get('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const donoId = obterDonoId(request);
    const arquivo = await buscarArquivo(id);
    garantirDono(arquivo, donoId);
    return reply.send(apresentarArquivo(arquivo));
  });

  app.get('/:id/conteudo', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const { expira, assinatura } = conteudoQuerySchema.parse(request.query);
    const donoIdHeader =
      typeof request.headers['x-dono-id'] === 'string' ? request.headers['x-dono-id'] : undefined;

    const { arquivo, stream } = await obterParaDownload(id, {
      expira,
      assinatura,
      donoId: donoIdHeader,
    });

    const nomeSeguro = arquivo.nomeOriginal.replace(/[\r\n"]/g, '_');
    reply.header('content-type', arquivo.mimeType);
    reply.header('content-length', arquivo.tamanho);
    reply.header('content-disposition', `inline; filename="${nomeSeguro}"`);
    return reply.send(stream);
  });

  app.get('/:id/thumbnail', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const { expira, assinatura } = conteudoQuerySchema.parse(request.query);
    const donoIdHeader =
      typeof request.headers['x-dono-id'] === 'string' ? request.headers['x-dono-id'] : undefined;

    const { stream } = await obterThumbnail(id, { expira, assinatura, donoId: donoIdHeader });
    reply.header('content-type', 'image/webp');
    return reply.send(stream);
  });

  app.post('/:id/url-assinada', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const donoId = obterDonoId(request);
    const { expiraEmSegundos } = urlAssinadaBodySchema.parse(request.body ?? {});
    const url = await gerarUrlAssinada(id, donoId, expiraEmSegundos);
    return reply.send({ url, expiraEmSegundos });
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const donoId = obterDonoId(request);
    await removerArquivo(id, donoId);
    return reply.status(204).send();
  });
}
