import { createHmac, timingSafeEqual } from 'node:crypto';

import { config } from '../../config/env.js';

function assinar(arquivoId: string, expiraEm: number): string {
  return createHmac('sha256', config.ASSINATURA_SECRET)
    .update(`${arquivoId}.${expiraEm}`)
    .digest('hex');
}

export function montarUrlAssinada(arquivoId: string, expiraEmSegundos: number): string {
  const expiraEm = Date.now() + expiraEmSegundos * 1000;
  const assinatura = assinar(arquivoId, expiraEm);
  return `${config.BASE_URL}/v1/arquivos/${arquivoId}/conteudo?expira=${expiraEm}&assinatura=${assinatura}`;
}

export function assinaturaValida(arquivoId: string, expiraEm: number, assinatura: string): boolean {
  if (!Number.isFinite(expiraEm) || expiraEm < Date.now()) {
    return false;
  }
  const esperada = Buffer.from(assinar(arquivoId, expiraEm));
  const recebida = Buffer.from(assinatura);
  return esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
}
