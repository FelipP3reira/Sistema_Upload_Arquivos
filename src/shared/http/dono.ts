import type { FastifyRequest } from 'fastify';

import { ErroNaoAutorizado } from '../erros/erros-aplicacao.js';

// Identidade do dono vem de um header posto por um gateway de autenticação à
// frente (auth de verdade é o projeto dedicado do portfólio). Aqui só confio
// nesse header e checo a posse a partir dele.
export function obterDonoId(request: FastifyRequest): string {
  const valor = request.headers['x-dono-id'];
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new ErroNaoAutorizado('Informe o dono no header x-dono-id.');
  }
  return valor.trim();
}
