import { config } from '../../config/env.js';
import { ArmazenamentoLocal } from './local.js';
import { ArmazenamentoS3 } from './s3.js';
import type { Armazenamento } from './storage.js';

function criarArmazenamento(): Armazenamento {
  if (config.STORAGE_DRIVER === 's3') {
    return new ArmazenamentoS3({
      endpoint: config.S3_ENDPOINT!,
      region: config.S3_REGION,
      bucket: config.S3_BUCKET!,
      accessKey: config.S3_ACCESS_KEY!,
      secretKey: config.S3_SECRET_KEY!,
    });
  }
  return new ArmazenamentoLocal(config.STORAGE_DIR);
}

export const armazenamento: Armazenamento = criarArmazenamento();
export type { Armazenamento } from './storage.js';
