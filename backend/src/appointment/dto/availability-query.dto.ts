import { Matches } from 'class-validator';
import { Trim } from '@/common/decorators/trim.decorator';

export class AvailabilityQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  @Trim()
  date: string;
}
