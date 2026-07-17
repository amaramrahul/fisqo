import { createTaxUserSchema, toTaxUserDto } from '@fisqo/core';
import type { ItemEnvelope, ListEnvelope, PrismaClient, TaxUserDto } from '@fisqo/core';
import { Router } from 'express';
import { ApiError } from '../errors.js';
import { isUniqueViolation } from '../prisma-errors.js';

export function taxUsersRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const taxUsers = await prisma.taxUser.findMany({ orderBy: { createdAt: 'asc' } });
    const body: ListEnvelope<TaxUserDto> = {
      data: taxUsers.map(toTaxUserDto),
      // Always null until pagination is implemented. See ADR 0001.
      nextCursor: null,
    };
    res.json(body);
  });

  router.post('/', async (req, res) => {
    // Throws ZodError on failure; Express 5 forwards it to the error handler,
    // which maps it to 422.
    const input = createTaxUserSchema.parse(req.body);

    try {
      const created = await prisma.taxUser.create({ data: input });
      const body: ItemEnvelope<TaxUserDto> = { data: toTaxUserDto(created) };
      res.status(201).json(body);
    } catch (error) {
      // The UNIQUE index is the duplicate check. A read-then-write in
      // application code would be racy.
      if (isUniqueViolation(error)) {
        throw new ApiError(
          409,
          'PAN_ALREADY_EXISTS',
          `A tax user with PAN ${input.pan} already exists.`,
        );
      }
      throw error;
    }
  });

  return router;
}
