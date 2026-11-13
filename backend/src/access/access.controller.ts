import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Role } from '@/database/generated/prisma/enums';
import type { AccessTokenPayload } from '@/auth/types/jwt-payload';
import { ShareCodeService } from './share-code.service';
import { OwnerAccessService } from './owner-access.service';
import { ShareDurationDto } from './dto/share-duration.dto';
import { RedeemShareCodeDto } from './dto/redeem-share-code.dto';
import {
  AccessGrantResponseDto,
  RedeemShareCodeResponseDto,
  RevokeAccessResponseDto,
  ShareCodeResponseDto,
} from './dto/access-response.dto';

@Controller()
@UseGuards(RolesGuard)
export class AccessController {
  constructor(
    private readonly shareCodeService: ShareCodeService,
    private readonly ownerAccessService: OwnerAccessService,
  ) {}

  // US-03 AC1
  @Roles(Role.OWNER)
  @Post('pets/:petId/share-codes')
  generateCode(
    @CurrentUser('sub') ownerId: string,
    @Param('petId', ParseUUIDPipe) petId: string,
    @Body() dto: ShareDurationDto,
  ): Promise<ShareCodeResponseDto> {
    return this.shareCodeService.generate(petId, ownerId, dto.durationDays);
  }

  // US-03 AC2–AC5
  @Roles(Role.CLINIC_STAFF)
  @Post('share-codes/redeem')
  redeemCode(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: RedeemShareCodeDto,
  ): Promise<RedeemShareCodeResponseDto> {
    return this.shareCodeService.redeem(user, dto.code);
  }

  // US-04: the owner's access list
  @Roles(Role.OWNER)
  @Get('pets/:petId/access-grants')
  listGrants(
    @CurrentUser('sub') ownerId: string,
    @Param('petId', ParseUUIDPipe) petId: string,
  ): Promise<AccessGrantResponseDto[]> {
    return this.ownerAccessService.listActive(petId, ownerId);
  }

  // US-04 AC1–AC3
  @Roles(Role.OWNER)
  @Delete('pets/:petId/clinics/:clinicId/access')
  revokeClinic(
    @CurrentUser('sub') ownerId: string,
    @Param('petId', ParseUUIDPipe) petId: string,
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
  ): Promise<RevokeAccessResponseDto> {
    return this.ownerAccessService.revokeClinic(petId, ownerId, clinicId);
  }

  // US-04 AC4
  @Roles(Role.OWNER)
  @Patch('access-grants/:grantId')
  extendGrant(
    @CurrentUser('sub') ownerId: string,
    @Param('grantId', ParseUUIDPipe) grantId: string,
    @Body() dto: ShareDurationDto,
  ): Promise<AccessGrantResponseDto> {
    return this.ownerAccessService.extend(grantId, ownerId, dto.durationDays);
  }
}
