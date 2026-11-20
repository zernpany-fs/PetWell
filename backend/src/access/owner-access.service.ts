import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AccessType, GrantEndReason } from '@/database/generated/prisma/enums';
import { isGrantActive } from './access-level';
import { ShareDuration, shareExpiry } from './share-code';
import { ensureOwnedActivePet } from './owned-pet';
import {
  AccessGrantResponseDto,
  RevokeAccessResponseDto,
} from './dto/access-response.dto';

const grantView = {
  id: true,
  type: true,
  expiresAt: true,
  createdAt: true,
  clinic: { select: { id: true, name: true } },
} as const;

// Same rule as isGrantActive (D17), as a database filter.
function activeGrantWhere(now: Date) {
  return {
    endedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

/** The owner's side of access: list, revoke, extend (US-04). */
@Injectable()
export class OwnerAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** D43: the owner sees only active grants, newest first. */
  async listActive(
    petId: string,
    ownerId: string,
  ): Promise<AccessGrantResponseDto[]> {
    await ensureOwnedActivePet(this.prisma, petId, ownerId);
    return this.prisma.petAccessGrant.findMany({
      where: { petId, ...activeGrantWhere(new Date()) },
      select: grantView,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * US-04 AC1–AC3: ends every active grant of the clinic for this pet,
   * both kinds (D12). Appointments are not touched; D13/D23 keep the
   * ended grant ended.
   */
  async revokeClinic(
    petId: string,
    ownerId: string,
    clinicId: string,
  ): Promise<RevokeAccessResponseDto> {
    await ensureOwnedActivePet(this.prisma, petId, ownerId);
    const now = new Date();

    const result = await this.prisma.petAccessGrant.updateMany({
      where: { petId, clinicId, ...activeGrantWhere(now) },
      data: { endedAt: now, endReason: GrantEndReason.REVOKED },
    });
    if (result.count === 0) {
      throw new NotFoundException('No active access for this clinic');
    }
    return { message: 'Access revoked', endedGrants: result.count };
  }

  /** US-04 AC4, D27: new duration counted from now, owner shares only. */
  async extend(
    grantId: string,
    ownerId: string,
    durationDays: ShareDuration,
  ): Promise<AccessGrantResponseDto> {
    const grant = await this.prisma.petAccessGrant.findUnique({
      where: { id: grantId },
      include: { pet: { select: { ownerId: true, isActive: true } } },
    });
    if (!grant || !grant.pet.isActive || grant.pet.ownerId !== ownerId) {
      throw new NotFoundException('Access grant not found');
    }
    // D44: wrong kind or already ended -> 409 with a clear reason.
    if (grant.type !== AccessType.OWNER_SHARE) {
      throw new ConflictException('Only access shared by code can be extended');
    }
    const now = new Date();
    if (!isGrantActive(grant, now)) {
      throw new ConflictException('This access has already ended');
    }

    // Compare-and-set: a revoke at the same moment wins, not the extend.
    const updated = await this.prisma.petAccessGrant.updateMany({
      where: { id: grantId, endedAt: null },
      data: { expiresAt: shareExpiry(durationDays, now) },
    });
    if (updated.count === 0) {
      throw new ConflictException('This access has already ended');
    }

    return this.prisma.petAccessGrant.findUniqueOrThrow({
      where: { id: grantId },
      select: grantView,
    });
  }
}
