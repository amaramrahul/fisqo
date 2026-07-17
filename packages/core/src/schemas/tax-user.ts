import { z } from 'zod';

/** Five letters, four digits, one letter. For example ABCDE1234F. */
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const ISO_CALENDAR_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Rejects dates that match the ISO shape but do not exist, such as 2025-02-30.
 * Date.UTC rolls those over to the following month, so a round-trip comparison
 * catches them.
 */
function isRealCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Canonicalises before validating. SQLite UNIQUE is case-sensitive, so an
 * un-canonicalised PAN would let the same taxpayer be inserted twice in
 * different cases.
 */
export const panSchema = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .refine((value) => PAN_REGEX.test(value), {
    message: 'PAN must be 10 characters in the format AAAAA9999A',
  });

export const dobSchema = z
  .string()
  .refine((value) => ISO_CALENDAR_DATE_REGEX.test(value), {
    message: 'Date of birth must be a calendar date in YYYY-MM-DD format',
  })
  .refine(isRealCalendarDate, {
    message: 'Date of birth must be a real calendar date',
  });

export const createTaxUserSchema = z.object({
  pan: panSchema,
  dob: dobSchema,
});

export type CreateTaxUserInput = z.input<typeof createTaxUserSchema>;
export type CreateTaxUser = z.output<typeof createTaxUserSchema>;

/** The entity as stored. `dob` is a calendar date; the timestamps are instants. */
export interface TaxUser {
  id: string;
  pan: string;
  dob: string;
  createdAt: Date;
  updatedAt: Date;
}

/** The entity as it crosses the wire, where every field is a string. */
export interface TaxUserDto {
  id: string;
  pan: string;
  dob: string;
  createdAt: string;
  updatedAt: string;
}

export function toTaxUserDto(user: TaxUser): TaxUserDto {
  return {
    id: user.id,
    pan: user.pan,
    dob: user.dob,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
