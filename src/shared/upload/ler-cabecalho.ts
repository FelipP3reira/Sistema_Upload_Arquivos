import type { Readable } from 'node:stream';

// Lê os primeiros bytes de um stream SEM consumir o resto. Usar for-await com
// break destruiria o stream; aqui leio via read() em modo paused e deixo o
// restante intacto para seguir direto pro storage.
export function lerCabecalho(stream: Readable, minimo: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pedacos: Buffer[] = [];
    let total = 0;

    function finalizar(): void {
      stream.removeListener('readable', aoLer);
      stream.removeListener('end', aoFim);
      stream.removeListener('error', aoErro);
    }
    function aoLer(): void {
      let chunk: Buffer | null;
      while ((chunk = stream.read() as Buffer | null) !== null) {
        pedacos.push(chunk);
        total += chunk.length;
        if (total >= minimo) {
          finalizar();
          stream.pause();
          resolve(Buffer.concat(pedacos));
          return;
        }
      }
    }
    function aoFim(): void {
      finalizar();
      resolve(Buffer.concat(pedacos));
    }
    function aoErro(erro: Error): void {
      finalizar();
      reject(erro);
    }

    stream.on('readable', aoLer);
    stream.on('end', aoFim);
    stream.on('error', aoErro);
  });
}
