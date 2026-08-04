import { UserResponseDto } from '@/user/dto/user-response.dto';

export class LoginResponseDto {
  access_token: string;

  user: UserResponseDto;
}
