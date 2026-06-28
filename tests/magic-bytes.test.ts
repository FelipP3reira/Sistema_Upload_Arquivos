import { describe, expect, it } from 'vitest';

import { detectarTipoPermitido } from '../src/shared/upload/tipos-permitidos.js';

// PNG 1x1 transparente, de verdade (base64).
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PDF = Buffer.from('%PDF-1.4\n%âãÏÓ\n');

describe('detecção por magic bytes', () => {
  it('reconhece PNG, JPEG e PDF pelos bytes reais', async () => {
    expect((await detectarTipoPermitido(PNG_1X1))?.mime).toBe('image/png');
    expect((await detectarTipoPermitido(JPEG))?.mime).toBe('image/jpeg');
    expect((await detectarTipoPermitido(PDF))?.mime).toBe('application/pdf');
  });

  it('rejeita conteúdo que não bate com nenhum tipo permitido (magic byte falso)', async () => {
    // Conteúdo de texto que alguém poderia mandar como "foto.png".
    const textoDisfarcado = Buffer.from('isto é só texto, não é uma imagem de verdade');
    expect(await detectarTipoPermitido(textoDisfarcado)).toBeNull();
  });

  it('rejeita um tipo real porém fora da allowlist', async () => {
    // ZIP (PK\x03\x04) é um tipo real, mas não está liberado.
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    expect(await detectarTipoPermitido(zip)).toBeNull();
  });
});
