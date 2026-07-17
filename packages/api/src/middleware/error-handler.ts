import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import type { ApiErrorBody } from '@fisqo/core';
import { z, ZodError } from 'zod';
import { ApiError } from '../errors.js';

/** Emits the standardised { code, message, details? } shape from the tech design. */
export function errorHandler(): ErrorRequestHandler {
  return (error: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (error instanceof ApiError) {
      const body: ApiErrorBody = { code: error.code, message: error.message };
      if (error.details !== undefined) body.details = error.details;
      res.status(error.status).json(body);
      return;
    }

    if (error instanceof ZodError) {
      // z.flattenError replaces the deprecated error.flatten() in Zod 4.
      res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'The request body failed validation.',
        details: z.flattenError(error).fieldErrors,
      } satisfies ApiErrorBody);
      return;
    }

    console.error('Unhandled API error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    } satisfies ApiErrorBody);
  };
}
