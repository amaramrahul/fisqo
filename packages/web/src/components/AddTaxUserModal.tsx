import { useState } from "react";
import type { FormEvent } from "react";
import type { TaxUser } from "../types.js";
import { createTaxUser } from "../api/taxUsers.js";

const PAN_PATTERN = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/;

interface Props {
  onCreated: (taxUser: TaxUser) => void;
  onClose: () => void;
}

export function AddTaxUserModal({ onCreated, onClose }: Props) {
  const [pan, setPan] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const panValid = PAN_PATTERN.test(pan);
  const canSubmit = panValid && dateOfBirth.length > 0 && !submitting;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const taxUser = await createTaxUser({ pan, dateOfBirth });
      onCreated(taxUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tax user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div role="dialog" aria-label="Add new tax user">
      <form onSubmit={handleSubmit}>
        <label>
          PAN
          <input
            value={pan}
            onChange={(e) => setPan(e.target.value)}
            placeholder="AAAAA9999A"
          />
        </label>
        {pan.length > 0 && !panValid && (
          <p role="alert">PAN must be in the format AAAAA9999A</p>
        )}
        <label>
          Date of Birth
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={!canSubmit}>
          Save
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
}
