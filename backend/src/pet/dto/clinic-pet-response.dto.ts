import { PetResponseDto } from './pet-response.dto';

export class ClinicPetOwnerDto {
  firstName: string;

  lastName: string;

  phone: string | null;

  email: string;
}

// FULL: clinic has an active grant (D5, D9, D33).
export class ClinicPetFullDto extends PetResponseDto {
  accessLevel: 'FULL';

  owner: ClinicPetOwnerDto;
}

// AUTHORED_ONLY: no active grant, but has authored records (D20, D33).
export class ClinicPetLimitedDto {
  accessLevel: 'AUTHORED_ONLY';

  id: string;

  name: string;

  species: string;
}

export type ClinicPetResponseDto = ClinicPetFullDto | ClinicPetLimitedDto;
