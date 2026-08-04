import { ClinicType, RecordType } from '@/database/generated/prisma/enums';

export class RecordClinicDto {
  id: string;
  name: string;
  clinicType: ClinicType;
}

export class HealthRecordResponseDto {
  id: string;

  petId: string;

  clinicId: string;

  createdById: string;

  appointmentId: string | null;

  recordType: RecordType;

  description: string;

  recordDate: Date;

  nextDueDate: Date | null;

  attachments: string[];

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;

  clinic?: RecordClinicDto;
}
