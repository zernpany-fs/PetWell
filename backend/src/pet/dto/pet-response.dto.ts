export class PetResponseDto {
  id: string;

  ownerId: string;

  name: string;

  species: string;

  breed: string | null;

  birthDate: Date | null;

  photoUrl: string | null;

  chronicCondition: string | null;

  drugAllergy: string | null;

  microchipNo: string | null;

  latestWeight: number | null;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
