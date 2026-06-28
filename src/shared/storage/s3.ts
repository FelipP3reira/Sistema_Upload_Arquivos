import type { Readable } from 'node:stream';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

import type { Armazenamento } from './storage.js';

interface ConfigS3 {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}

export class ArmazenamentoS3 implements Armazenamento {
  private readonly cliente: S3Client;
  private readonly bucket: string;

  constructor(cfg: ConfigS3) {
    this.bucket = cfg.bucket;
    this.cliente = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: true, // necessário para o MinIO
      credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
    });
  }

  async salvar(chave: string, conteudo: Readable, mimeType: string): Promise<void> {
    // lib-storage faz upload multipart por baixo, então o stream não precisa ter
    // tamanho conhecido nem ser carregado todo em memória.
    const upload = new Upload({
      client: this.cliente,
      params: { Bucket: this.bucket, Key: chave, Body: conteudo, ContentType: mimeType },
    });
    await upload.done();
  }

  async ler(chave: string): Promise<Readable> {
    const resposta = await this.cliente.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: chave }),
    );
    return resposta.Body as Readable;
  }

  async remover(chave: string): Promise<void> {
    await this.cliente.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: chave }));
  }

  async existe(chave: string): Promise<boolean> {
    try {
      await this.cliente.send(new HeadObjectCommand({ Bucket: this.bucket, Key: chave }));
      return true;
    } catch {
      return false;
    }
  }
}
