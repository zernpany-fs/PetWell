import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  addressLine: z.string().max(255, 'Address is too long.').optional(),
  subdistrict: z.string().max(100, 'Subdistrict is too long.').optional(),
  district: z.string().max(100, 'District is too long.').optional(),
  province: z.string().max(100, 'Province is too long.').optional(),
  postalCode: z
    .string()
    .regex(/^$|^\d{5}$/, 'Postal code must be 5 digits.')
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
