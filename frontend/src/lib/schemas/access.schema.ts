import { z } from 'zod';

// Same rule as the backend (RedeemShareCodeDto): exactly 6 digits.
// A wrong format is rejected here and is not counted for lockout (D40).
export const redeemShareCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});
export type RedeemShareCodeInput = z.infer<typeof redeemShareCodeSchema>;
