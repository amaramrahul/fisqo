/**
 * Detects a unique-constraint violation structurally rather than with an
 * instanceof check against PrismaClientKnownRequestError. Prisma 7 exposes that
 * class through several import paths, and a structural check cannot be broken
 * by the generated client moving.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}
