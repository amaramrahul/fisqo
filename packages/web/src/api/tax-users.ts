import type { CreateTaxUserInput, ItemEnvelope, ListEnvelope, TaxUserDto } from '@fisqo/core';
import { apiFetch } from './client.js';

export function listTaxUsers(): Promise<ListEnvelope<TaxUserDto>> {
  return apiFetch<ListEnvelope<TaxUserDto>>('/tax-users');
}

export function createTaxUser(input: CreateTaxUserInput): Promise<ItemEnvelope<TaxUserDto>> {
  return apiFetch<ItemEnvelope<TaxUserDto>>('/tax-users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
