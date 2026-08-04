import { z } from "zod";

export const appointmentStatusEnum = z.enum([
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "RESCHEDULED",
  "COMPLETED",
  "CANCELLED",
]);

export const createAppointmentSchema = z.object({
  petId: z.uuid("Please select a pet."),
  clinicId: z.uuid("Please select a clinic."),
  appointmentDate: z
    .string()
    .min(1, "Please choose a date & time.")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Please choose a valid date & time.",
    })
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: "Please choose a date & time in the future.",
    }),
  notes: z.string().optional(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  status: appointmentStatusEnum,
  reason: z.string().optional(),
});
export type UpdateAppointmentStatusInput = z.infer<
  typeof updateAppointmentStatusSchema
>;
