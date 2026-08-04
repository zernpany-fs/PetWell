import { IsOptional, IsString } from 'class-validator';
import { Trim } from '@/common/decorators/trim.decorator';

export class SearchPetQueryDto {
  @IsOptional()
  @IsString()
  @Trim()
  q?: string;
}
