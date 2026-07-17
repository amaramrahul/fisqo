import path from 'node:path';
import { applyMigrations, createPrismaClient } from '@fisqo/core';
import { createApp } from './app.js';

const PORT = Number(process.env['PORT'] ?? 3000);
const HOST = '127.0.0.1';
const DATABASE_URL = process.env['DATABASE_URL'] ?? 'file:./fisqo.db';
const WEB_DIST = process.env['WEB_DIST'];

// The tech design requires migrations to be applied on startup.
applyMigrations(DATABASE_URL);

const prisma = createPrismaClient(DATABASE_URL);
const app = createApp({
  prisma,
  ...(WEB_DIST !== undefined && { webDist: path.resolve(WEB_DIST) }),
});

// Loopback only. No inbound traffic from the network.
const server = app.listen(PORT, HOST, () => {
  console.log(`Fisqo API listening on http://${HOST}:${PORT}`);
});

async function shutdown(): Promise<void> {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
