import type { PrismaClient } from '@fisqo/core';
import express from 'express';
import type { Express } from 'express';
import { errorHandler } from './middleware/error-handler.js';
import { loopbackGuard } from './middleware/loopback-guard.js';
import { taxUsersRouter } from './routes/tax-users.js';
import { serveWebApp } from './static.js';

export interface CreateAppOptions {
  prisma: PrismaClient;
  /** Absolute path to the built SPA. Omitted in tests and in dev, where Vite serves it. */
  webDist?: string;
}

export function createApp({ prisma, webDist }: CreateAppOptions): Express {
  const app = express();

  app.use(express.json());
  app.use(loopbackGuard());
  app.use('/api/v1/tax-users', taxUsersRouter(prisma));

  if (webDist !== undefined) {
    serveWebApp(app, webDist);
  }

  app.use(errorHandler());

  return app;
}
