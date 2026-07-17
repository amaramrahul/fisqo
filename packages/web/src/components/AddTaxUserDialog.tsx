import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiRequestError } from '../api/client.js';
import { createTaxUser } from '../api/tax-users.js';

interface AddTaxUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddTaxUserDialog({ open, onClose, onCreated }: AddTaxUserDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pan, setPan] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    // showModal gives focus trapping and Esc-to-close for free.
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createTaxUser({ pan, dob });
      setPan('');
      setDob('');
      onCreated();
    } catch (caught) {
      // #9 replaces this with inline, field-level messages.
      setError(
        caught instanceof ApiRequestError
          ? caught.body.message
          : 'Could not add the tax user. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog ref={dialogRef} onClose={onClose} aria-labelledby="add-tax-user-title">
      <h2 id="add-tax-user-title">Add new tax user</h2>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="pan">PAN</label>
          <input
            id="pan"
            name="pan"
            value={pan}
            autoComplete="off"
            onChange={(event) => setPan(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="dob">Date of birth</label>
          {/* A plain date input for now. #9 replaces this with a DD/MM/YYYY picker. */}
          <input
            id="dob"
            name="dob"
            type="date"
            value={dob}
            onChange={(event) => setDob(event.target.value)}
          />
        </div>

        {error !== null && <p role="alert">{error}</p>}

        <div className="dialog-actions">
          <button type="button" value="cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
