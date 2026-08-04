import { z } from 'zod';

export const clinicTypeEnum = z.enum(['GENERAL', 'EXOTIC', 'EMERGENCY_24HR']);

export const updateClinicSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  clinicType: clinicTypeEnum.optional(),
  googleMapsLink: z.string().optional(),
});
export type UpdateClinicInput = z.infer<typeof updateClinicSchema>;
