import type { TaxUserDto } from '@fisqo/core';

export function TaxUserSection({ taxUser }: { taxUser: TaxUserDto }) {
  return (
    <li className="tax-user-section">
      <h2>{taxUser.pan}</h2>
      <p>No filings yet.</p>
    </li>
  );
}
