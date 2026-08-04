import {
  AppointmentStatus,
  ClinicType,
} from '@/database/generated/prisma/enums';

export class AppointmentPetDto {
  id: string;
  name: string;
  species: string;
}

export class AppointmentClinicDto {
  id: string;
  name: string;
  clinicType: ClinicType;
}

export class AppointmentResponseDto {
  id: string;

  petId: string;

  clinicId: string;

  appointmentDate: Date;

  status: AppointmentStatus;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;

  pet?: AppointmentPetDto;

  clinic?: AppointmentClinicDto;
}
