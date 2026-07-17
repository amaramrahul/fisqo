import { useCallback, useEffect, useState } from 'react';
import type { TaxUserDto } from '@fisqo/core';
import { listTaxUsers } from '../api/tax-users.js';
import { EmptyState } from './EmptyState.js';
import { TaxUserSection } from './TaxUserSection.js';

export function Dashboard() {
  const [taxUsers, setTaxUsers] = useState<TaxUserDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await listTaxUsers();
      setTaxUsers(data);
      setLoadError(null);
    } catch {
      // Distinct from the empty state on purpose: showing "no tax users yet"
      // after a failed load would tell the user their data had vanished.
      setLoadError('Could not load tax users.');
      setTaxUsers([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <h1>Fisqo</h1>
        <button type="button">Add new tax user</button>
      </header>

      {loadError !== null && <p role="alert">{loadError}</p>}

      {taxUsers === null ? (
        <p>Loading...</p>
      ) : loadError !== null ? null : taxUsers.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="tax-user-list">
          {taxUsers.map((taxUser) => (
            <TaxUserSection key={taxUser.id} taxUser={taxUser} />
          ))}
        </ul>
      )}
    </main>
  );
}
