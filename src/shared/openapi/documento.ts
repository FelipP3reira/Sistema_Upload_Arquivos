import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from 'openapi3-ts/oas30';
import { z } from 'zod';

extendZodWithOpenApi(z);

const registro = new OpenAPIRegistry();

const erroSchema = registro.register(
  'Erro',
  z.object({
    erro: z.object({
      codigo: z.string(),
      mensagem: z.string(),
      detalhes: z.unknown().optional(),
    }),
  }),
);

const arquivoSchema = registro.register(
  'Arquivo',
  z.object({
    id: z.string().uuid(),
    nomeOriginal: z.string(),
    mimeType: z.string(),
    tamanho: z.number().int(),
    temThumbnail: z.boolean(),
    criadoEm: z.string().datetime(),
  }),
);

const headerDono = z.object({
  'x-dono-id': z.string().openapi({ example: 'usuario-1' }),
});

const idParam = z.object({ id: z.string().uuid() });

function json(description: string, schema: z.ZodTypeAny) {
  return { description, content: { 'application/json': { schema } } };
}

function erro(description: string) {
  return json(description, erroSchema);
}

registro.registerPath({
  method: 'post',
  path: '/v1/arquivos',
  tags: ['Arquivos'],
  summary: 'Faz upload de um ou mais arquivos (validados por magic bytes)',
  request: {
    headers: headerDono,
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({ arquivo: z.string().openapi({ format: 'binary' }) }),
        },
      },
    },
  },
  responses: {
    201: json('Arquivos salvos', z.object({ arquivos: z.array(arquivoSchema) })),
    401: erro('Sem o header x-dono-id'),
    413: erro('Arquivo acima do limite'),
    415: erro('Tipo não permitido'),
  },
});

registro.registerPath({
  method: 'get',
  path: '/v1/arquivos/{id}',
  tags: ['Arquivos'],
  summary: 'Metadados do arquivo (só o dono)',
  request: { params: idParam, headers: headerDono },
  responses: {
    200: json('Metadados', arquivoSchema),
    403: erro('Não é o dono'),
    404: erro('Não encontrado'),
  },
});

registro.registerPath({
  method: 'get',
  path: '/v1/arquivos/{id}/conteudo',
  tags: ['Arquivos'],
  summary: 'Baixa o conteúdo (dono via header ou URL assinada)',
  request: {
    params: idParam,
    query: z.object({ expira: z.number().optional(), assinatura: z.string().optional() }),
  },
  responses: {
    200: { description: 'Stream do arquivo' },
    401: erro('Sem credencial válida'),
    403: erro('Não é o dono'),
    404: erro('Não encontrado'),
  },
});

registro.registerPath({
  method: 'get',
  path: '/v1/arquivos/{id}/thumbnail',
  tags: ['Arquivos'],
  summary: 'Baixa a thumbnail webp (imagens)',
  request: { params: idParam, headers: headerDono },
  responses: {
    200: { description: 'Thumbnail webp' },
    404: erro('Sem thumbnail ou arquivo não encontrado'),
  },
});

registro.registerPath({
  method: 'post',
  path: '/v1/arquivos/{id}/url-assinada',
  tags: ['Arquivos'],
  summary: 'Gera uma URL assinada temporária (só o dono)',
  request: {
    params: idParam,
    headers: headerDono,
    body: {
      content: {
        'application/json': {
          schema: z.object({ expiraEmSegundos: z.number().int().positive().optional() }),
        },
      },
    },
  },
  responses: {
    200: json('URL assinada', z.object({ url: z.string(), expiraEmSegundos: z.number().int() })),
    403: erro('Não é o dono'),
    404: erro('Não encontrado'),
  },
});

registro.registerPath({
  method: 'delete',
  path: '/v1/arquivos/{id}',
  tags: ['Arquivos'],
  summary: 'Remove o arquivo (só o dono)',
  request: { params: idParam, headers: headerDono },
  responses: {
    204: { description: 'Removido' },
    403: erro('Não é o dono'),
    404: erro('Não encontrado'),
  },
});

export function gerarDocumentoOpenApi(): OpenAPIObject {
  const gerador = new OpenApiGeneratorV3(registro.definitions);
  return gerador.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Serviço de Upload de Arquivos',
      version: '1.0.0',
      description:
        'Upload seguro com validação por magic bytes, thumbnails, storage plugável e URLs assinadas.',
    },
    servers: [{ url: '/' }],
  });
}
