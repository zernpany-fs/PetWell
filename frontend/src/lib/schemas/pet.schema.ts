import { z } from 'zod';

export const createPetSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  species: z.string().min(1, 'Species is required.'),
  breed: z.string().optional(),
  birthDate: z.string().optional(),
  chronicCondition: z.string().optional(),
  drugAllergy: z.string().optional(),
  microchipNo: z.string().optional(),
  latestWeight: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().min(0).optional(),
  ),
});
export type CreatePetInput = z.infer<typeof createPetSchema>;

export const updatePetSchema = createPetSchema.partial();
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
