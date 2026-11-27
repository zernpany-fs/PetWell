import { IsIn } from 'class-validator';

export const STAFF_DECISIONS = ['APPROVE', 'REJECT'] as const;
export type StaffDecision = (typeof STAFF_DECISIONS)[number];

/** D76: body of PATCH /clinics/me/staff-requests/:userId */
export class DecideStaffRequestDto {
  @IsIn(STAFF_DECISIONS, { message: 'decision must be APPROVE or REJECT' })
  decision: StaffDecision;
}

/** D76: one pending staff sign-up, as the clinic sees it. */
export class StaffRequestResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: Date;
}
