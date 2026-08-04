import { IsNotEmpty, IsUUID } from 'class-validator';
import { RegisterDto } from './register.dto';

export class RegisterClinicStaffDto extends RegisterDto {
  @IsUUID()
  @IsNotEmpty()
  clinicId: string;
}
