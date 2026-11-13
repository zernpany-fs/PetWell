export type Role = 'OWNER' | 'CLINIC_STAFF';
export type ClinicType = 'GENERAL' | 'EXOTIC' | 'EMERGENCY_24HR';
export type RecordType = 'VACCINE' | 'TREATMENT';
export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'RESCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED';

export type UserResponse = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  addressLine: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  role: Role;
  clinicId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LoginResponse = {
  access_token: string;
  user: UserResponse;
};

export type MessageResponse = { message: string };

export type Clinic = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  description: string | null;
  photoUrl: string | null;
  clinicType: ClinicType;
  googleMapsLink: string | null;
  isActive: boolean;
  createdAt: string;
};

export type Pet = {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
  photoUrl: string | null;
  chronicCondition: string | null;
  drugAllergy: string | null;
  microchipNo: string | null;
  latestWeight: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PetSearchOwner = {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
};

// V2 (D18, D33, D38): FULL results have the whole pet and `owner`;
// AUTHORED_ONLY results have only id, name and species.
export type PetSearchResult = Pick<Pet, 'id' | 'name' | 'species'> &
  Partial<Omit<Pet, 'id' | 'name' | 'species'>> & {
    accessLevel: 'FULL' | 'AUTHORED_ONLY';
    owner?: PetSearchOwner;
  };

export type RecordClinic = { id: string; name: string; clinicType: ClinicType };

export type HealthRecord = {
  id: string;
  petId: string;
  clinicId: string;
  createdById: string;
  appointmentId: string | null;
  recordType: RecordType;
  description: string;
  recordDate: string;
  nextDueDate: string | null;
  attachments: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clinic?: RecordClinic;
};

export type AppointmentPet = { id: string; name: string; species: string };
export type AppointmentClinic = { id: string; name: string; clinicType: ClinicType };

export type Appointment = {
  id: string;
  petId: string;
  clinicId: string;
  appointmentDate: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  pet?: AppointmentPet;
  clinic?: AppointmentClinic;
};

export type SlotAvailability = {
  slotStart: string;
  hour: number;
  booked: number;
  remaining: number;
  isFull: boolean;
  isPast: boolean;
};

export type DayAvailability = {
  clinicId: string;
  date: string;
  capacityPerSlot: number;
  slots: SlotAvailability[];
};

export type StatusLogAuthor = {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
};

export type AppointmentStatusLog = {
  id: string;
  appointmentId: string;
  changedById: string;
  oldStatus: AppointmentStatus | null;
  newStatus: AppointmentStatus;
  reason: string | null;
  changedAt: string;
  changedBy?: StatusLogAuthor;
};
