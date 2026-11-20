import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { EnvVariable } from '@/config/env.validation';
import { AccessTokenPayload } from '@/auth/types/jwt-payload';
import { AccessType } from '@/database/generated/prisma/enums';
import {
  generateShareCode,
  hashShareCode,
  SHARE_CODE_TTL_MS,
  ShareDuration,
  shareExpiry,
} from './share-code';
import {
  ACCOUNT_LOCKOUT,
  CLINIC_LOCKOUT,
  lockedUntil,
  lookbackMs,
} from './lockout';
import { ensureOwnedActivePet } from './owned-pet';
import {
  RedeemShareCodeResponseDto,
  ShareCodeResponseDto,
} from './dto/access-response.dto';

// D26: retry when a live code already has the same hash.
const MAX_GENERATE_TRIES = 5;

// US-03 AC3: one message for wrong, expired and used codes, so it never
// reveals whether a code existed.
const INVALID_CODE_MESSAGE = 'Invalid or expired code';

@Injectable()
export class ShareCodeService {
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<EnvVariable, true>,
  ) {
    this.secret = config.get('SHARE_CODE_SECRET', { infer: true });
  }

  /** US-03 AC1: owner creates a 6-digit, 15-minute, single-use code. */
  async generate(
    petId: string,
    ownerId: string,
    durationDays: ShareDuration,
  ): Promise<ShareCodeResponseDto> {
    await ensureOwnedActivePet(this.prisma, petId, ownerId);
    const now = new Date();

    for (let i = 0; i < MAX_GENERATE_TRIES; i++) {
      const code = generateShareCode();
      const codeHash = hashShareCode(code, this.secret);

      // Clinics enter only the code, so two live codes must never match.
      const clash = await this.prisma.shareCode.findFirst({
        where: { codeHash, usedAt: null, expiresAt: { gt: now } },
        select: { id: true },
      });
      if (clash) continue;

      const created = await this.prisma.shareCode.create({
        data: {
          petId,
          codeHash,
          durationDays,
          expiresAt: new Date(now.getTime() + SHARE_CODE_TTL_MS),
        },
      });
      // The plain code is returned once and never stored (D26).
      return { code, durationDays, expiresAt: created.expiresAt };
    }

    throw new ServiceUnavailableException(
      'Could not generate a share code. Please try again.',
    );
  }

  /** US-03 AC2–AC5: clinic staff enter a code and get an owner share. */
  async redeem(
    user: AccessTokenPayload,
    code: string,
  ): Promise<RedeemShareCodeResponseDto> {
    if (!user.clinicId) {
      throw new ForbiddenException('Clinic staff is not linked to a clinic');
    }
    const clinicId = user.clinicId;
    const now = new Date();

    await this.ensureNotLockedOut(user.sub, clinicId, now);

    const shareCode = await this.prisma.shareCode.findFirst({
      where: {
        codeHash: hashShareCode(code, this.secret),
        usedAt: null,
        expiresAt: { gt: now },
        pet: { isActive: true },
      },
      include: { pet: { select: { id: true, name: true, species: true } } },
    });
    if (!shareCode) {
      await this.recordAttempt(user.sub, clinicId, false);
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    const grant = await this.prisma.$transaction(async (tx) => {
      // Compare-and-set: if two staff enter the code at the same moment,
      // only one marks it used (D7). shareCodeId is also unique (D25).
      const marked = await tx.shareCode.updateMany({
        where: { id: shareCode.id, usedAt: null },
        data: { usedAt: now },
      });
      if (marked.count === 0) return null;

      // D27: always a new grant, even if the clinic already has one.
      const created = await tx.petAccessGrant.create({
        data: {
          type: AccessType.OWNER_SHARE,
          petId: shareCode.petId,
          clinicId,
          shareCodeId: shareCode.id,
          expiresAt: shareExpiry(shareCode.durationDays, now), // D41
        },
      });
      await tx.shareCodeAttempt.create({
        data: { userId: user.sub, clinicId, success: true },
      });
      return created;
    });

    if (!grant) {
      await this.recordAttempt(user.sub, clinicId, false);
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    return {
      grantId: grant.id,
      pet: shareCode.pet,
      expiresAt: grant.expiresAt,
    };
  }

  /** D14, D40, D42: 429 while the account or the clinic is locked. */
  private async ensureNotLockedOut(
    userId: string,
    clinicId: string,
    now: Date,
  ): Promise<void> {
    // The clinic rule looks back further, so one query covers both rules.
    const failures = await this.prisma.shareCodeAttempt.findMany({
      where: {
        clinicId,
        success: false,
        attemptedAt: {
          gte: new Date(now.getTime() - lookbackMs(CLINIC_LOCKOUT)),
        },
      },
      select: { userId: true, attemptedAt: true },
    });

    const accountUntil = lockedUntil(
      failures.filter((f) => f.userId === userId).map((f) => f.attemptedAt),
      ACCOUNT_LOCKOUT,
      now,
    );
    const clinicUntil = lockedUntil(
      failures.map((f) => f.attemptedAt),
      CLINIC_LOCKOUT,
      now,
    );

    const until = [accountUntil, clinicUntil]
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (until) {
      const minutes = Math.ceil((until.getTime() - now.getTime()) / 60000);
      throw new HttpException(
        `Too many failed attempts. Try again in ${minutes} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async recordAttempt(
    userId: string,
    clinicId: string,
    success: boolean,
  ): Promise<void> {
    await this.prisma.shareCodeAttempt.create({
      data: { userId, clinicId, success },
    });
  }
}
