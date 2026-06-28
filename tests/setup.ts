import { execSync } from 'node:child_process';
import { rm } from 'node:fs/promises';

import { afterAll, beforeAll, beforeEach } from 'vitest';

import { config } from '../src/config/env.js';
import { prisma } from '../src/shared/prisma/cliente.js';

beforeAll(() => {
  execSync('npx prisma migrate deploy', { stdio: 'ignore' });
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "arquivos" RESTART IDENTITY CASCADE;');
  await rm(config.STORAGE_DIR, { recursive: true, force: true });
});

afterAll(async () => {
  await prisma.$disconnect();
  await rm(config.STORAGE_DIR, { recursive: true, force: true });
});
