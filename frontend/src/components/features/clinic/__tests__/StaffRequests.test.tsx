import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffRequests from '../StaffRequests';
import { decideStaffRequestAction } from '@/lib/actions/staff-request.action';
import type { StaffRequest } from '@/lib/api/api.type';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/actions/staff-request.action', () => ({
  decideStaffRequestAction: vi.fn(),
}));
const decide = vi.mocked(decideStaffRequestAction);

const requests: StaffRequest[] = [
  {
    id: 'u1',
    firstName: 'Nok',
    lastName: 'New',
    email: 'nok@test.com',
    phone: '0812345678',
    createdAt: '2026-11-27T03:00:00.000Z',
  },
];

describe('StaffRequests (US-09, D76)', () => {
  beforeEach(() => {
    decide
      .mockReset()
      .mockResolvedValue({ success: true, message: 'Staff approved' });
  });

  it('says so when no one is waiting', () => {
    render(<StaffRequests requests={[]} />);
    expect(screen.getByText(/no one is waiting/i)).toBeInTheDocument();
  });

  it('shows who asked, with email, phone and sign-up date (AC3)', () => {
    render(<StaffRequests requests={requests} />);
    expect(screen.getByText('Nok New')).toBeInTheDocument();
    expect(
      screen.getByText(/nok@test\.com · 0812345678 · signed up 27 Nov 2026/),
    ).toBeInTheDocument();
  });

  it('Approve sends APPROVE for that person at once (AC4)', async () => {
    render(<StaffRequests requests={requests} />);
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(decide).toHaveBeenCalledWith('u1', 'APPROVE');
  });

  it('Reject asks first, and Cancel sends nothing (AC5, D75)', async () => {
    render(<StaffRequests requests={requests} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      /cannot be used to sign up again/,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(decide).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('confirmed Reject sends REJECT (AC5)', async () => {
    render(<StaffRequests requests={requests} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, reject' }));
    expect(decide).toHaveBeenCalledWith('u1', 'REJECT');
  });
});
