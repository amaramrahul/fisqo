import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from './error-handler.js';
import { loopbackGuard } from './loopback-guard.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(loopbackGuard());
  app.get('/probe', (_req, res) => { res.json({ ok: true }); });
  app.post('/probe', (_req, res) => { res.status(201).json({ ok: true }); });
  app.use(errorHandler());
  return app;
}

const LOOPBACK_ORIGIN = 'http://127.0.0.1:3000';

describe('loopbackGuard', () => {
  it('allows a GET from a loopback host', async () => {
    const response = await request(buildApp()).get('/probe').set('Host', '127.0.0.1:3000');
    expect(response.status).toBe(200);
  });

  it('allows a POST carrying a loopback Origin', async () => {
    const response = await request(buildApp())
      .post('/probe')
      .set('Host', '127.0.0.1:3000')
      .set('Origin', LOOPBACK_ORIGIN)
      .send({});
    expect(response.status).toBe(201);
  });

  it('allows a POST whose Origin is the Vite dev server', async () => {
    const response = await request(buildApp())
      .post('/probe')
      .set('Host', 'localhost:3000')
      .set('Origin', 'http://localhost:5173')
      .send({});
    expect(response.status).toBe(201);
  });

  it('rejects a POST from a foreign Origin', async () => {
    const response = await request(buildApp())
      .post('/probe')
      .set('Host', '127.0.0.1:3000')
      .set('Origin', 'https://evil.example.com')
      .send({});
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: 'FORBIDDEN_ORIGIN' });
  });

  it('rejects a POST with no Origin or Referer at all', async () => {
    const response = await request(buildApp())
      .post('/probe')
      .set('Host', '127.0.0.1:3000')
      .send({});
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: 'FORBIDDEN_ORIGIN' });
  });

  it('falls back to Referer when Origin is absent', async () => {
    const response = await request(buildApp())
      .post('/probe')
      .set('Host', '127.0.0.1:3000')
      .set('Referer', 'http://127.0.0.1:3000/dashboard')
      .send({});
    expect(response.status).toBe(201);
  });

  it('rejects a foreign Host, which is what DNS rebinding looks like', async () => {
    const response = await request(buildApp())
      .get('/probe')
      .set('Host', 'attacker.example.com');
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: 'FORBIDDEN_ORIGIN' });
  });
});
