import { IsIn } from 'class-validator';
import { SHARE_DURATIONS, type ShareDuration } from '../share-code';

// Used to generate a code and to extend an owner share (D3, D27).
// The field is required: send null explicitly for unlimited (D41).
export class ShareDurationDto {
  @IsIn(SHARE_DURATIONS, {
    message: 'durationDays must be 7, 30, 90 or null (unlimited)',
  })
  durationDays: ShareDuration;
}
