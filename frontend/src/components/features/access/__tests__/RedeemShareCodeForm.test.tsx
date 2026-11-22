import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RedeemShareCodeForm from '../RedeemShareCodeForm';
import { redeemShareCodeAction } from '@/lib/actions/access.action';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/actions/access.action', () => ({
  redeemShareCodeAction: vi.fn(),
}));
const redeem = vi.mocked(redeemShareCodeAction);

describe('RedeemShareCodeForm (US-03 AC2–AC4)', () => {
  beforeEach(() => {
    redeem.mockReset();
    push.mockReset();
  });

  it('keeps digits only, at most 6', async () => {
    const user = userEvent.setup();
    render(<RedeemShareCodeForm />);
    const input = screen.getByLabelText('Share code');

    await user.type(input, '12a3-45678');

    expect(input).toHaveValue('123456');
  });

  it('rejects a short code without calling the API, so it is not counted (D40)', async () => {
    const user = userEvent.setup();
    render(<RedeemShareCodeForm />);

    await user.type(screen.getByLabelText('Share code'), '123');
    await user.click(screen.getByRole('button', { name: 'Get access' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter the 6-digit code.',
    );
    expect(redeem).not.toHaveBeenCalled();
  });

  it('opens the pet after a valid code (AC2)', async () => {
    redeem.mockResolvedValue({
      success: true,
      message: 'Access granted to Milo.',
      petId: 'pet-9',
    });
    const user = userEvent.setup();
    render(<RedeemShareCodeForm />);

    await user.type(screen.getByLabelText('Share code'), '048213');
    await user.click(screen.getByRole('button', { name: 'Get access' }));

    expect(redeem).toHaveBeenCalledWith({ code: '048213' });
    expect(push).toHaveBeenCalledWith('/staff/pets/pet-9');
  });

  it("shows the API's message for a wrong, expired or used code (D42)", async () => {
    redeem.mockResolvedValue({
      success: false,
      message: 'Invalid or expired code',
      code: 'API_ERROR',
    });
    const user = userEvent.setup();
    render(<RedeemShareCodeForm />);

    await user.type(screen.getByLabelText('Share code'), '111111');
    await user.click(screen.getByRole('button', { name: 'Get access' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid or expired code',
    );
    expect(push).not.toHaveBeenCalled();
  });
});
