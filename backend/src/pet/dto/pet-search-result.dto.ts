import { PetResponseDto } from './pet-response.dto';

export class PetSearchOwnerDto {
  id: string;

  firstName: string;

  lastName: string;

  phone: string | null;

  email: string;
}

export class PetSearchResultDto extends PetResponseDto {
  owner: PetSearchOwnerDto;
}
