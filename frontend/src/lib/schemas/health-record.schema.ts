import { z } from 'zod';

export const recordTypeEnum = z.enum(['VACCINE', 'TREATMENT']);

export const createHealthRecordSchema = z.object({
  recordType: recordTypeEnum,
  description: z.string().min(1, 'Description is required.'),
  recordDate: z.string().min(1, 'Record date is required.'),
  nextDueDate: z.string().optional(),
});
export type CreateHealthRecordInput = z.infer<
  typeof createHealthRecordSchema
>;

export const updateHealthRecordSchema = z.object({
  recordType: recordTypeEnum.optional(),
  description: z.string().min(1).optional(),
  nextDueDate: z.string().optional(),
});
export type UpdateHealthRecordInput = z.infer<
  typeof updateHealthRecordSchema
>;
