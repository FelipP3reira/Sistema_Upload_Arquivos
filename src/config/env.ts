import 'dotenv/config';
import { z } from 'zod';

const esquemaAmbiente = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3336),
    BASE_URL: z.string().url().default('http://localhost:3336'),
    DATABASE_URL: z.string().url(),

    // Segredo das URLs assinadas (HMAC). Troque por algo forte em produção.
    ASSINATURA_SECRET: z
      .string()
      .min(32, 'O segredo de assinatura precisa de ao menos 32 caracteres.'),

    // Limite de tamanho por arquivo (padrão 25 MB).
    TAMANHO_MAX_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(25 * 1024 * 1024),

    // Storage: local (filesystem) por padrão; s3 para MinIO/S3.
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_DIR: z.string().default('./dados-upload'),

    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
  })
  .refine(
    (cfg) =>
      cfg.STORAGE_DRIVER !== 's3' ||
      (cfg.S3_ENDPOINT && cfg.S3_BUCKET && cfg.S3_ACCESS_KEY && cfg.S3_SECRET_KEY),
    { message: 'STORAGE_DRIVER=s3 exige S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY e S3_SECRET_KEY.' },
  );

const leitura = esquemaAmbiente.safeParse(process.env);

if (!leitura.success) {
  const problemas = leitura.error.errors.map((erro) => `  ${erro.path.join('.')}: ${erro.message}`);
  console.error(`Configuração de ambiente inválida:\n${problemas.join('\n')}`);
  process.exit(1);
}

export const config = leitura.data;
