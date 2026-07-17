import type { PrismaClient } from '@fisqo/core';
import express from 'express';
import type { Express } from 'express';
import { errorHandler } from './middleware/error-handler.js';
import { loopbackGuard } from './middleware/loopback-guard.js';
import { taxUsersRouter } from './routes/tax-users.js';

export interface CreateAppOptions {
  prisma: PrismaClient;
}

export function createApp({ prisma }: CreateAppOptions): Express {
  const app = express();

  app.use(express.json());
  app.use(loopbackGuard());
  app.use('/api/v1/tax-users', taxUsersRouter(prisma));
  app.use(errorHandler());

  return app;
}
