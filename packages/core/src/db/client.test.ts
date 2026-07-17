import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyMigrations, createPrismaClient } from './client.js';
import type { PrismaClient } from './client.js';

let directory: string;
let prisma: PrismaClient;

beforeAll(() => {
  // Absolute path: Prisma 7 resolves relative SQLite URLs against prisma.config.ts.
  directory = mkdtempSync(path.join(tmpdir(), 'fisqo-core-'));
  const databaseUrl = `file:${path.join(directory, 'test.db')}`;
  applyMigrations(databaseUrl);
  prisma = createPrismaClient(databaseUrl);
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

describe('TaxUser persistence', () => {
  it('round-trips a tax user, keeping dob an unshifted calendar string', async () => {
    const created = await prisma.taxUser.create({
      data: { pan: 'ABCDE1234F', dob: '1985-03-15' },
    });

    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.dob).toBe('1985-03-15');

    const found = await prisma.taxUser.findUnique({ where: { pan: 'ABCDE1234F' } });
    expect(found?.dob).toBe('1985-03-15');
  });

  it('rejects a duplicate PAN with Prisma error code P2002', async () => {
    await prisma.taxUser.create({ data: { pan: 'ZZZZZ9999Z', dob: '1990-01-01' } });

    await expect(
      prisma.taxUser.create({ data: { pan: 'ZZZZZ9999Z', dob: '1991-02-02' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
