import { z } from "zod";

export const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN must be in the format AAAAA9999A");

export const dateOfBirthSchema = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "Date of Birth must be a valid date",
  })
  .refine((val) => new Date(val).getTime() < Date.now(), {
    message: "Date of Birth must be in the past",
  });

export const createTaxUserSchema = z.object({
  pan: panSchema,
  dateOfBirth: dateOfBirthSchema,
});

export type CreateTaxUserInput = z.infer<typeof createTaxUserSchema>;
