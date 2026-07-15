import type { TaxUser } from "../types.js";

interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export async function listTaxUsers(): Promise<TaxUser[]> {
  const res = await fetch("/api/v1/tax-users");
  if (!res.ok) {
    throw new Error("Failed to load tax users");
  }
  const body = (await res.json()) as { taxUsers: TaxUser[] };
  return body.taxUsers;
}

export async function createTaxUser(input: {
  pan: string;
  dateOfBirth: string;
}): Promise<TaxUser> {
  const res = await fetch("/api/v1/tax-users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) {
    const error = body as ApiError;
    throw new Error(error.message);
  }
  return (body as { taxUser: TaxUser }).taxUser;
}
