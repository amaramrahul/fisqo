import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// A fresh database per run, so the empty-state assertion is never polluted by
// a previous run's tax users.
const directory = mkdtempSync(path.join(tmpdir(), 'fisqo-e2e-'));

process.env.DATABASE_URL = `file:${path.join(directory, 'e2e.db')}`;
process.env.PORT = '3100';
process.env.WEB_DIST = path.resolve('packages/web/dist');

await import('../packages/api/dist/server.js');
