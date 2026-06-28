import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';

import type { MultipartFile } from '@fastify/multipart';
import type { Arquivo } from '@prisma/client';

import { ErroTamanhoExcedido, ErroTipoNaoPermitido } from '../../shared/erros/erros-aplicacao.js';
import { prisma } from '../../shared/prisma/cliente.js';
import { armazenamento } from '../../shared/storage/index.js';
import { lerCabecalho } from '../../shared/upload/ler-cabecalho.js';
import { detectarTipoPermitido } from '../../shared/upload/tipos-permitidos.js';

// 4100 bytes cobrem as assinaturas que o file-type precisa para os tipos que
// aceitamos, sem bufferizar o arquivo inteiro.
const TAMANHO_CABECALHO = 4100;

export async function armazenarArquivo(donoId: string, parte: MultipartFile): Promise<Arquivo> {
  const cabecalho = await lerCabecalho(parte.file, TAMANHO_CABECALHO);

  const tipo = await detectarTipoPermitido(cabecalho);
  if (!tipo) {
    parte.file.destroy();
    throw new ErroTipoNaoPermitido(
      'Tipo de arquivo não permitido (verificado pelos bytes reais, não pela extensão).',
    );
  }

  const chave = gerarChave(tipo.ext);
  const contador = { total: 0 };
  await armazenamento.salvar(chave, juntarConteudo(cabecalho, parte.file, contador), tipo.mime);

  // O multipart trunca no limite de tamanho; se truncou, apagamos o que entrou
  // e recusamos.
  if (parte.file.truncated) {
    await armazenamento.remover(chave);
    throw new ErroTamanhoExcedido('Arquivo maior que o limite permitido.');
  }

  return prisma.arquivo.create({
    data: {
      chave,
      nomeOriginal: parte.filename,
      mimeType: tipo.mime,
      tamanho: contador.total,
      donoId,
    },
  });
}

// Nome de armazenamento aleatório, com sharding por prefixo. O nome original do
// cliente nunca toca o disco — vira só metadado.
function gerarChave(ext: string): string {
  const hex = randomBytes(16).toString('hex');
  return `${hex.slice(0, 2)}/${hex.slice(2, 4)}/${hex}.${ext}`;
}

function juntarConteudo(cabecalho: Buffer, resto: Readable, contador: { total: number }): Readable {
  return Readable.from(
    (async function* () {
      contador.total += cabecalho.length;
      yield cabecalho;
      for await (const chunk of resto) {
        const buf = Buffer.from(chunk as Buffer);
        contador.total += buf.length;
        yield buf;
      }
    })(),
  );
}
