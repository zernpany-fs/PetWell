import { AccessType } from '@/database/generated/prisma/enums';

// Shown to the owner once; only the hash is stored (D26).
export class ShareCodeResponseDto {
  code: string;

  durationDays: number | null;

  expiresAt: Date; // when the code itself stops working (15 min, D7)
}

export class RedeemShareCodeResponseDto {
  grantId: string;

  pet: { id: string; name: string; species: string };

  expiresAt: Date | null; // when the clinic's access ends; null = unlimited
}

// One row of the owner's access list (US-04).
export class AccessGrantResponseDto {
  id: string;

  type: AccessType;

  clinic: { id: string; name: string };

  expiresAt: Date | null;

  createdAt: Date;
}

export class RevokeAccessResponseDto {
  message: string;

  endedGrants: number;
}
