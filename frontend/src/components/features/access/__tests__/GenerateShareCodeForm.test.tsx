import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GenerateShareCodeForm from '../GenerateShareCodeForm';
import { generateShareCodeAction } from '@/lib/actions/access.action';

vi.mock('@/lib/actions/access.action', () => ({
  generateShareCodeAction: vi.fn(),
}));
const generate = vi.mocked(generateShareCodeAction);

function codeResponse(secondsValid: number, durationDays: number | null = 7) {
  return {
    success: true as const,
    shareCode: {
      code: '048213',
      durationDays,
      expiresAt: new Date(Date.now() + secondsValid * 1000).toISOString(),
    },
  };
}

describe('GenerateShareCodeForm (US-03 AC1, D51)', () => {
  beforeEach(() => generate.mockReset());
  afterEach(() => vi.useRealTimers());

  it('selects 7 days by default (D51)', () => {
    render(<GenerateShareCodeForm petId="pet-1" />);
    expect(screen.getByRole('radio', { name: '7 days' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('sends the chosen duration, and null for Unlimited (D41)', async () => {
    generate.mockResolvedValue(codeResponse(900, null));
    const user = userEvent.setup();
    render(<GenerateShareCodeForm petId="pet-1" />);

    await user.click(screen.getByRole('radio', { name: 'Unlimited' }));
    await user.click(
      screen.getByRole('button', { name: /generate share code/i }),
    );

    expect(generate).toHaveBeenCalledWith('pet-1', { durationDays: null });
    expect(await screen.findByLabelText('Share code')).toHaveTextContent(
      '048213',
    );
    expect(screen.getByText(/unlimited access/)).toBeInTheDocument();
  });

  it('keeps a leading zero and shows the countdown', async () => {
    generate.mockResolvedValue(codeResponse(754));
    const user = userEvent.setup();
    render(<GenerateShareCodeForm petId="pet-1" />);

    await user.click(
      screen.getByRole('button', { name: /generate share code/i }),
    );

    expect(await screen.findByLabelText('Share code')).toHaveTextContent(
      '048213',
    );
    expect(screen.getByText(/Expires in 12:34/)).toBeInTheDocument();
  });

  it('hides the code at 0 and offers a new one (D7, D51)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    generate.mockResolvedValue(codeResponse(3));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<GenerateShareCodeForm petId="pet-1" />);

    await user.click(
      screen.getByRole('button', { name: /generate share code/i }),
    );
    expect(await screen.findByLabelText('Share code')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    await waitFor(() =>
      expect(screen.queryByLabelText('Share code')).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: /generate new code/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/The last code expired/)).toBeInTheDocument();
  });

  it('shows the error when the code cannot be created', async () => {
    generate.mockResolvedValue({
      success: false,
      message: 'Pet not found',
      code: 'API_ERROR',
    });
    const user = userEvent.setup();
    render(<GenerateShareCodeForm petId="pet-1" />);

    await user.click(
      screen.getByRole('button', { name: /generate share code/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Pet not found');
    expect(screen.queryByLabelText('Share code')).not.toBeInTheDocument();
  });
});
