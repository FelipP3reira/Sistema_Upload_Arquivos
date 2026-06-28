import { Readable } from 'node:stream';

import type { Arquivo } from '@prisma/client';
import sharp from 'sharp';

import { prisma } from '../../shared/prisma/cliente.js';
import { armazenamento } from '../../shared/storage/index.js';

const LADO_MAX = 256;

export async function gerarThumbnail(arquivo: Arquivo): Promise<Arquivo> {
  const original = await lerComoBuffer(await armazenamento.ler(arquivo.chave));

  const thumb = await sharp(original)
    .resize(LADO_MAX, LADO_MAX, { fit: 'inside', withoutEnlargement: true })
    .webp()
    .toBuffer();

  const chaveThumb = `${arquivo.chave}.thumb.webp`;
  await armazenamento.salvar(chaveThumb, Readable.from(thumb), 'image/webp');

  return prisma.arquivo.update({
    where: { id: arquivo.id },
    data: { thumbnailChave: chaveThumb },
  });
}

async function lerComoBuffer(stream: Readable): Promise<Buffer> {
  const pedacos: Buffer[] = [];
  for await (const chunk of stream) {
    pedacos.push(Buffer.from(chunk as Buffer));
  }
  return Buffer.concat(pedacos);
}
