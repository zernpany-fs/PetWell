import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResetPasswordForm from '../ResetPasswordForm';
import { resetPasswordAction } from '@/lib/actions/auth.action';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/actions/auth.action', () => ({
  resetPasswordAction: vi.fn(),
}));
const reset = vi.mocked(resetPasswordAction);

async function fill(password: string, confirm: string) {
  const user = userEvent.setup();
  await user.type(
    screen.getByPlaceholderText('At least 8 characters'),
    password,
  );
  await user.type(screen.getByPlaceholderText('Type it again'), confirm);
  await user.click(screen.getByRole('button', { name: 'Set new password' }));
}

describe('ResetPasswordForm (US-07 AC3–AC4, D59, D62)', () => {
  beforeEach(() => {
    reset.mockReset();
    push.mockReset();
  });

  it('uses the registration password rule (D59, D63)', async () => {
    render(<ResetPasswordForm token="tok" />);
    await fill('abc', 'abc');

    expect(
      await screen.findByText('Password must be at least 8 characters.'),
    ).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });

  it('asks for the same password twice', async () => {
    render(<ResetPasswordForm token="tok" />);
    await fill('newpass1', 'newpass2');

    expect(
      await screen.findByText('Passwords do not match.'),
    ).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });

  it('sends the token from the link and goes to log in (AC3)', async () => {
    reset.mockResolvedValue({ success: true, message: 'Password changed.' });
    render(<ResetPasswordForm token="tok-123" />);
    await fill('newpass1', 'newpass1');

    expect(reset).toHaveBeenCalledWith('tok-123', {
      password: 'newpass1',
      confirmPassword: 'newpass1',
    });
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('shows one message for a bad link, with a way to get a new one (AC4)', async () => {
    reset.mockResolvedValue({
      success: false,
      message: 'This reset link is invalid or has expired.',
      code: 'INVALID_LINK',
    });
    render(<ResetPasswordForm token="old" />);
    await fill('newpass1', 'newpass1');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'This reset link is invalid or has expired.',
    );
    expect(
      screen.getByRole('link', { name: 'Get a new link' }),
    ).toHaveAttribute('href', '/forgot-password');
    expect(push).not.toHaveBeenCalled();
  });
});
