import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    // Os testes de integração compartilham o banco; rodar arquivos em paralelo
    // geraria corrida na limpeza entre eles.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      BASE_URL: 'http://localhost:3336',
      DATABASE_URL: 'postgresql://upload:upload@localhost:5436/upload_test?schema=public',
      ASSINATURA_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres-ok',
      STORAGE_DRIVER: 'local',
      STORAGE_DIR: './dados-upload-test',
      // Limite baixo nos testes para exercitar o 413 sem precisar de arquivo enorme.
      TAMANHO_MAX_BYTES: '1024',
    },
  },
});
