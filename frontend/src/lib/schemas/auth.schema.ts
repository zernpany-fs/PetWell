import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  phone: z.string().optional(),
  email: z.email('Invalid email address.'),
  password: z
    .string()
    .regex(
      /^[0-9a-zA-Z]{6,}$/,
      'Password must be at least 6 letters or numbers.',
    ),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const registerClinicStaffSchema = registerSchema.extend({
  clinicId: z.uuid('Please select a clinic.'),
});
export type RegisterClinicStaffInput = z.infer<
  typeof registerClinicStaffSchema
>;

export const loginSchema = z.object({
  email: z.email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

// US-07 (D57): the email to send a reset link to.
export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email address.'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// US-07 (D59): same password rule as registration, typed twice.
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .regex(
        /^[0-9a-zA-Z]{6,}$/,
        'Password must be at least 6 letters or numbers.',
      ),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
