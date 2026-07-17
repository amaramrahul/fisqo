import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { applyMigrations, createPrismaClient } from '@fisqo/core';
import type { PrismaClient } from '@fisqo/core';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';

const LOOPBACK = { Host: '127.0.0.1:3000', Origin: 'http://127.0.0.1:3000' };

let directory: string;
let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'fisqo-api-'));
  const databaseUrl = `file:${path.join(directory, 'test.db')}`;
  applyMigrations(databaseUrl);
  prisma = createPrismaClient(databaseUrl);
  app = createApp({ prisma });
});

beforeEach(async () => {
  await prisma.taxUser.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

describe('GET /api/v1/tax-users', () => {
  it('returns an empty envelope when no tax users exist', async () => {
    const response = await request(app).get('/api/v1/tax-users').set(LOOPBACK);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [], nextCursor: null });
  });

  it('returns created tax users', async () => {
    await prisma.taxUser.create({ data: { pan: 'ABCDE1234F', dob: '1985-03-15' } });

    const response = await request(app).get('/api/v1/tax-users').set(LOOPBACK);

    expect(response.status).toBe(200);
    expect(response.body.nextCursor).toBeNull();
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ pan: 'ABCDE1234F', dob: '1985-03-15' });
  });
});

describe('POST /api/v1/tax-users', () => {
  it('creates a tax user and returns 201 with the created resource', async () => {
    const response = await request(app)
      .post('/api/v1/tax-users')
      .set(LOOPBACK)
      .send({ pan: 'ABCDE1234F', dob: '1985-03-15' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ pan: 'ABCDE1234F', dob: '1985-03-15' });
    expect(response.body.data.id).toMatch(/^[0-9a-f-]{36}$/);

    expect(await prisma.taxUser.count()).toBe(1);
  });

  it('canonicalises PAN to uppercase before persisting', async () => {
    const response = await request(app)
      .post('/api/v1/tax-users')
      .set(LOOPBACK)
      .send({ pan: 'abcde1234f', dob: '1985-03-15' });

    expect(response.status).toBe(201);
    expect(response.body.data.pan).toBe('ABCDE1234F');
  });

  it('rejects a duplicate PAN with 409 rather than creating a second row', async () => {
    await request(app).post('/api/v1/tax-users').set(LOOPBACK)
      .send({ pan: 'ABCDE1234F', dob: '1985-03-15' });

    const response = await request(app).post('/api/v1/tax-users').set(LOOPBACK)
      .send({ pan: 'ABCDE1234F', dob: '1990-01-01' });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'PAN_ALREADY_EXISTS' });
    expect(await prisma.taxUser.count()).toBe(1);
  });

  it('treats a differently-cased duplicate PAN as a duplicate', async () => {
    await request(app).post('/api/v1/tax-users').set(LOOPBACK)
      .send({ pan: 'ABCDE1234F', dob: '1985-03-15' });

    const response = await request(app).post('/api/v1/tax-users').set(LOOPBACK)
      .send({ pan: 'abcde1234f', dob: '1990-01-01' });

    expect(response.status).toBe(409);
    expect(await prisma.taxUser.count()).toBe(1);
  });

  it('rejects a malformed PAN with 422 and names the offending field', async () => {
    const response = await request(app)
      .post('/api/v1/tax-users')
      .set(LOOPBACK)
      .send({ pan: 'NOPE', dob: '1985-03-15' });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.details.pan).toBeDefined();
    expect(await prisma.taxUser.count()).toBe(0);
  });

  it('rejects a malformed DOB with 422', async () => {
    const response = await request(app)
      .post('/api/v1/tax-users')
      .set(LOOPBACK)
      .send({ pan: 'ABCDE1234F', dob: '15/03/1985' });

    expect(response.status).toBe(422);
    expect(response.body.details.dob).toBeDefined();
  });
});
