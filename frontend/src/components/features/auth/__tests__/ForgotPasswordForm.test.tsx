import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordForm from '../ForgotPasswordForm';
import { forgotPasswordAction } from '@/lib/actions/auth.action';

vi.mock('@/lib/actions/auth.action', () => ({
  forgotPasswordAction: vi.fn(),
}));
const forgot = vi.mocked(forgotPasswordAction);
const SAME_MESSAGE =
  'If an account exists for that email, we have sent a reset link.';

describe('ForgotPasswordForm (US-07 AC1, D57, D62)', () => {
  beforeEach(() => forgot.mockReset());

  // 'someone@test' passes the browser's own email check but not ours.
  it('checks the email format before calling the API', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'someone@test',
    );
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(
      await screen.findByText('Invalid email address.'),
    ).toBeInTheDocument();
    expect(forgot).not.toHaveBeenCalled();
  });

  it('shows the API message and hides the form after sending (D57)', async () => {
    forgot.mockResolvedValue({ success: true, message: SAME_MESSAGE });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(
      screen.getByPlaceholderText('you@example.com'),
      'someone@test.com',
    );
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(forgot).toHaveBeenCalledWith({ email: 'someone@test.com' });
    expect(await screen.findByRole('status')).toHaveTextContent(SAME_MESSAGE);
    expect(
      screen.queryByPlaceholderText('you@example.com'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to log in' }),
    ).toHaveAttribute('href', '/login');
  });
});
