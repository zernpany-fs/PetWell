import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClinicAccessList from '../ClinicAccessList';
import {
  extendGrantAction,
  revokeClinicAccessAction,
} from '@/lib/actions/access.action';
import type { AccessGrant } from '@/lib/api/api.type';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/actions/access.action', () => ({
  extendGrantAction: vi.fn(),
  revokeClinicAccessAction: vi.fn(),
}));
const extend = vi.mocked(extendGrantAction);
const revoke = vi.mocked(revokeClinicAccessAction);

const clinicA = { id: 'clinic-a', name: 'Clinic A' };
const clinicB = { id: 'clinic-b', name: 'Clinic B' };
const grants: AccessGrant[] = [
  {
    id: 'g1',
    type: 'APPOINTMENT',
    clinic: clinicA,
    expiresAt: null,
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'g2',
    type: 'OWNER_SHARE',
    clinic: clinicA,
    expiresAt: '2026-12-01T12:00:00Z',
    createdAt: '2026-11-02T00:00:00Z',
  },
  {
    id: 'g3',
    type: 'APPOINTMENT',
    clinic: clinicB,
    expiresAt: null,
    createdAt: '2026-11-03T00:00:00Z',
  },
];

function rowOf(name: string) {
  return screen.getByText(name).closest('li') as HTMLElement;
}

describe('ClinicAccessList (US-04, D52)', () => {
  beforeEach(() => {
    extend
      .mockReset()
      .mockResolvedValue({ success: true, message: 'Access updated.' });
    revoke
      .mockReset()
      .mockResolvedValue({ success: true, message: 'Access revoked.' });
  });

  it('says so when no clinic has access', () => {
    render(<ClinicAccessList petId="pet-1" grants={[]} />);
    expect(
      screen.getByText(/No clinic can see these records/),
    ).toBeInTheDocument();
  });

  it('shows one row per clinic with each kind of access (D52)', () => {
    render(<ClinicAccessList petId="pet-1" grants={grants} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const a = rowOf('Clinic A');
    expect(within(a).getByText(/From an appointment/)).toBeInTheDocument();
    expect(
      within(a).getByText(/Shared by code · until 1 Dec 2026/),
    ).toBeInTheDocument();
  });

  it('offers Change only on access shared by code (D27)', () => {
    render(<ClinicAccessList petId="pet-1" grants={grants} />);

    expect(
      within(rowOf('Clinic A')).getAllByRole('button', { name: 'Change' }),
    ).toHaveLength(1);
    expect(
      within(rowOf('Clinic B')).queryByRole('button', { name: 'Change' }),
    ).not.toBeInTheDocument();
  });

  it('changes a share to the chosen duration, from now (US-04 AC4)', async () => {
    const user = userEvent.setup();
    render(<ClinicAccessList petId="pet-1" grants={grants} />);

    await user.click(screen.getByRole('button', { name: 'Change' }));
    await user.click(screen.getByRole('radio', { name: '90 days' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(extend).toHaveBeenCalledWith('pet-1', 'g2', { durationDays: 90 });
  });

  it('asks in the row before revoking, and Keep access does nothing (D52)', async () => {
    const user = userEvent.setup();
    render(<ClinicAccessList petId="pet-1" grants={grants} />);
    const a = rowOf('Clinic A');

    await user.click(within(a).getByRole('button', { name: 'Revoke' }));
    expect(within(a).getByRole('alert')).toHaveTextContent(
      'Your appointments with them are not cancelled',
    );

    await user.click(within(a).getByRole('button', { name: 'Keep access' }));
    expect(revoke).not.toHaveBeenCalled();
    expect(within(a).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('revokes the whole clinic, not one grant (D12)', async () => {
    const user = userEvent.setup();
    render(<ClinicAccessList petId="pet-1" grants={grants} />);
    const a = rowOf('Clinic A');

    await user.click(within(a).getByRole('button', { name: 'Revoke' }));
    await user.click(within(a).getByRole('button', { name: 'Yes, revoke' }));

    expect(revoke).toHaveBeenCalledWith('pet-1', 'clinic-a');
  });
});
