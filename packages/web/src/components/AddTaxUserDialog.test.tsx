import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as taxUsersApi from '../api/tax-users.js';
import { ApiRequestError } from '../api/client.js';
import { AddTaxUserDialog } from './AddTaxUserDialog.js';

const created = {
  id: '11111111-1111-4111-8111-111111111111',
  pan: 'ABCDE1234F',
  dob: '1985-03-15',
  createdAt: '2026-01-02T03:04:05.000Z',
  updatedAt: '2026-01-02T03:04:05.000Z',
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AddTaxUserDialog', () => {
  it('submits the entered PAN and DOB, then reports the new tax user', async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(taxUsersApi, 'createTaxUser').mockResolvedValue({ data: created });
    const onCreated = vi.fn();

    render(<AddTaxUserDialog open onClose={vi.fn()} onCreated={onCreated} />);

    await user.type(screen.getByLabelText(/pan/i), 'ABCDE1234F');
    await user.type(screen.getByLabelText(/date of birth/i), '1985-03-15');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(createSpy).toHaveBeenCalledWith({ pan: 'ABCDE1234F', dob: '1985-03-15' });
    expect(onCreated).toHaveBeenCalledOnce();
  });

  it('surfaces the server message when the PAN already exists', async () => {
    const user = userEvent.setup();
    vi.spyOn(taxUsersApi, 'createTaxUser').mockRejectedValue(
      new ApiRequestError(409, {
        code: 'PAN_ALREADY_EXISTS',
        message: 'A tax user with PAN ABCDE1234F already exists.',
      }),
    );
    const onCreated = vi.fn();

    render(<AddTaxUserDialog open onClose={vi.fn()} onCreated={onCreated} />);

    await user.type(screen.getByLabelText(/pan/i), 'ABCDE1234F');
    await user.type(screen.getByLabelText(/date of birth/i), '1985-03-15');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i);
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('surfaces the server message when validation fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(taxUsersApi, 'createTaxUser').mockRejectedValue(
      new ApiRequestError(422, {
        code: 'VALIDATION_ERROR',
        message: 'The request body failed validation.',
      }),
    );

    render(<AddTaxUserDialog open onClose={vi.fn()} onCreated={vi.fn()} />);

    await user.type(screen.getByLabelText(/pan/i), 'NOPE');
    await user.type(screen.getByLabelText(/date of birth/i), '1985-03-15');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/failed validation/i);
  });

  it('reports a non-API failure without leaking the raw error', async () => {
    const user = userEvent.setup();
    vi.spyOn(taxUsersApi, 'createTaxUser').mockRejectedValue(new Error('socket hang up'));

    render(<AddTaxUserDialog open onClose={vi.fn()} onCreated={vi.fn()} />);

    await user.type(screen.getByLabelText(/pan/i), 'ABCDE1234F');
    await user.type(screen.getByLabelText(/date of birth/i), '1985-03-15');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/could not add the tax user/i);
    expect(screen.queryByText(/socket hang up/i)).not.toBeInTheDocument();
  });

  it('closes without submitting when cancelled', async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(taxUsersApi, 'createTaxUser');
    const onClose = vi.fn();

    render(<AddTaxUserDialog open onClose={onClose} onCreated={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(createSpy).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('clears the PAN, DOB, and error state when the dialog closes and reopens', async () => {
    const user = userEvent.setup();
    vi.spyOn(taxUsersApi, 'createTaxUser').mockRejectedValue(
      new ApiRequestError(409, {
        code: 'PAN_ALREADY_EXISTS',
        message: 'A tax user with PAN ABCDE1234F already exists.',
      }),
    );

    const { rerender } = render(
      <AddTaxUserDialog open onClose={vi.fn()} onCreated={vi.fn()} />,
    );

    await user.type(screen.getByLabelText(/pan/i), 'ABCDE1234F');
    await user.type(screen.getByLabelText(/date of birth/i), '1985-03-15');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i);

    rerender(<AddTaxUserDialog open={false} onClose={vi.fn()} onCreated={vi.fn()} />);
    rerender(<AddTaxUserDialog open onClose={vi.fn()} onCreated={vi.fn()} />);

    expect(screen.getByLabelText(/pan/i)).toHaveValue('');
    expect(screen.getByLabelText(/date of birth/i)).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
