import { z } from 'zod';

// Same rule as the backend (RedeemShareCodeDto): exactly 6 digits.
// A wrong format is rejected here and is not counted for lockout (D40).
export const redeemShareCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});
export type RedeemShareCodeInput = z.infer<typeof redeemShareCodeSchema>;

// Same values as the backend (SHARE_DURATIONS, D3): 7 / 30 / 90 days,
// or null for unlimited. null must be sent explicitly (D41).
export const SHARE_DURATION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: null, label: 'Unlimited' },
] as const;

// D51: the shortest duration is the default.
export const DEFAULT_SHARE_DURATION = 7;

export const shareDurationSchema = z.object({
  durationDays: z.union(
    [z.literal(7), z.literal(30), z.literal(90), z.null()],
    { message: 'Choose how long the clinic can see the record.' },
  ),
});
export type ShareDurationInput = z.infer<typeof shareDurationSchema>;
