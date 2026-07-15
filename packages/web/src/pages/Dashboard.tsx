import { useEffect, useState } from "react";
import type { TaxUser } from "../types.js";
import { listTaxUsers } from "../api/taxUsers.js";
import { AddTaxUserModal } from "../components/AddTaxUserModal.js";

export function Dashboard() {
  const [taxUsers, setTaxUsers] = useState<TaxUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    listTaxUsers()
      .then(setTaxUsers)
      .finally(() => setLoading(false));
  }, []);

  function handleCreated(taxUser: TaxUser) {
    setTaxUsers((prev) => [...prev, taxUser]);
    setModalOpen(false);
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <main>
      <h1>Fisqo</h1>
      <button onClick={() => setModalOpen(true)}>Add new tax user</button>
      {taxUsers.length === 0 ? (
        <p>
          Fisqo helps you file your Indian income tax return locally, with
          first-class support for foreign income. Add a tax user to get
          started.
        </p>
      ) : (
        <ul data-testid="tax-user-list">
          {taxUsers.map((taxUser) => (
            <li key={taxUser.id} data-testid="tax-user-section">
              {taxUser.pan}
            </li>
          ))}
        </ul>
      )}
      {modalOpen && (
        <AddTaxUserModal
          onCreated={handleCreated}
          onClose={() => setModalOpen(false)}
        />
      )}
    </main>
  );
}
