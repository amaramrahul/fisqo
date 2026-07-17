import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaxUserDto } from '@fisqo/core';
import * as taxUsersApi from '../api/tax-users.js';
import { Dashboard } from './Dashboard.js';

function aTaxUser(overrides: Partial<TaxUserDto> = {}): TaxUserDto {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    pan: 'ABCDE1234F',
    dob: '1985-03-15',
    createdAt: '2026-01-02T03:04:05.000Z',
    updatedAt: '2026-01-02T03:04:05.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Dashboard', () => {
  it('shows the empty state, explaining what Fisqo does, when no tax users exist', async () => {
    vi.spyOn(taxUsersApi, 'listTaxUsers').mockResolvedValue({ data: [], nextCursor: null });

    render(<Dashboard />);
    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

    expect(screen.getByRole('heading', { name: /no tax users yet/i })).toBeInTheDocument();
    expect(screen.getByText(/income tax return/i)).toBeInTheDocument();
  });

  it('shows the Add new tax user button in the empty state', async () => {
    vi.spyOn(taxUsersApi, 'listTaxUsers').mockResolvedValue({ data: [], nextCursor: null });

    render(<Dashboard />);
    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

    expect(screen.getByRole('button', { name: /add new tax user/i })).toBeInTheDocument();
  });

  it('shows the Add new tax user button in the non-empty state too', async () => {
    vi.spyOn(taxUsersApi, 'listTaxUsers').mockResolvedValue({
      data: [aTaxUser()],
      nextCursor: null,
    });

    render(<Dashboard />);
    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

    expect(screen.getByRole('button', { name: /add new tax user/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /no tax users yet/i })).not.toBeInTheDocument();
  });

  it('lists a section per tax user, headed by PAN, with its own no-filings state', async () => {
    vi.spyOn(taxUsersApi, 'listTaxUsers').mockResolvedValue({
      data: [aTaxUser({ pan: 'ABCDE1234F' }), aTaxUser({ id: 'other-id', pan: 'ZZZZZ9999Z' })],
      nextCursor: null,
    });

    render(<Dashboard />);
    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

    expect(screen.getByRole('heading', { name: 'ABCDE1234F' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ZZZZZ9999Z' })).toBeInTheDocument();
    expect(screen.getAllByText(/no filings yet/i)).toHaveLength(2);
  });

  it('surfaces a load failure instead of rendering a misleading empty state', async () => {
    vi.spyOn(taxUsersApi, 'listTaxUsers').mockRejectedValue(new Error('network down'));

    render(<Dashboard />);
    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

    expect(screen.getByRole('alert')).toHaveTextContent(/could not load tax users/i);
    expect(screen.queryByRole('heading', { name: /no tax users yet/i })).not.toBeInTheDocument();
  });
});

describe('Dashboard add tax user flow', () => {
  it('opens the dialog, creates a tax user, and reloads the list', async () => {
    const user = userEvent.setup();
    const listSpy = vi
      .spyOn(taxUsersApi, 'listTaxUsers')
      .mockResolvedValueOnce({ data: [], nextCursor: null })
      .mockResolvedValueOnce({ data: [aTaxUser()], nextCursor: null });
    vi.spyOn(taxUsersApi, 'createTaxUser').mockResolvedValue({ data: aTaxUser() });

    render(<Dashboard />);
    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));
    expect(screen.getByRole('heading', { name: /no tax users yet/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add new tax user/i }));
    await user.type(screen.getByLabelText(/pan/i), 'ABCDE1234F');
    await user.type(screen.getByLabelText(/date of birth/i), '1985-03-15');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('heading', { name: 'ABCDE1234F' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /no tax users yet/i })).not.toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledTimes(2);
  });
});
