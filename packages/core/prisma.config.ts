import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 reads the datasource URL here rather than from schema.prisma.
 * SQLite URLs resolve relative to this file, so callers pass absolute paths.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env['DATABASE_URL'] ?? 'file:./dev.db',
  },
});
