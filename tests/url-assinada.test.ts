import { describe, expect, it } from 'vitest';

import { assinaturaValida, montarUrlAssinada } from '../src/shared/url/url-assinada.js';

function extrair(url: string): { expira: number; assinatura: string } {
  const query = new URL(url).searchParams;
  return { expira: Number(query.get('expira')), assinatura: query.get('assinatura') ?? '' };
}

describe('URL assinada', () => {
  const arquivoId = '11111111-1111-1111-1111-111111111111';

  it('valida uma assinatura recém-gerada', () => {
    const url = montarUrlAssinada(arquivoId, 60);
    const { expira, assinatura } = extrair(url);

    expect(assinaturaValida(arquivoId, expira, assinatura)).toBe(true);
  });

  it('rejeita assinatura adulterada', () => {
    const url = montarUrlAssinada(arquivoId, 60);
    const { expira } = extrair(url);

    expect(assinaturaValida(arquivoId, expira, 'assinatura-falsa')).toBe(false);
  });

  it('rejeita assinatura de outro arquivo', () => {
    const url = montarUrlAssinada(arquivoId, 60);
    const { expira, assinatura } = extrair(url);

    expect(assinaturaValida('22222222-2222-2222-2222-222222222222', expira, assinatura)).toBe(
      false,
    );
  });

  it('rejeita assinatura expirada', () => {
    const url = montarUrlAssinada(arquivoId, -1);
    const { expira, assinatura } = extrair(url);

    expect(assinaturaValida(arquivoId, expira, assinatura)).toBe(false);
  });
});
