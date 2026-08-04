import { AppointmentStatus, Role } from '@/database/generated/prisma/enums';

export class StatusLogAuthorDto {
  id: string;

  firstName: string;

  lastName: string;

  role: Role;
}

export class AppointmentStatusLogResponseDto {
  id: string;

  appointmentId: string;

  changedById: string;

  oldStatus: AppointmentStatus | null;

  newStatus: AppointmentStatus;

  reason: string | null;

  changedAt: Date;

  changedBy?: StatusLogAuthorDto;
}
