import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageFilePipe } from '../common/pipes/image-file.pipe';
import { ClinicService } from './clinic.service';
import { ClinicResponseDto } from './dto/clinic-response.dto';
import { ListClinicQueryDto } from './dto/list-clinic-query.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import {
  DecideStaffRequestDto,
  StaffRequestResponseDto,
} from './dto/staff-request.dto';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../database/generated/prisma/enums';
import type { AccessTokenPayload } from '../auth/types/jwt-payload';

@Controller('clinics')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Public()
  @Get()
  list(@Query() query: ListClinicQueryDto): Promise<ClinicResponseDto[]> {
    return this.clinicService.list(query);
  }

  // US-09 (D76): pending staff sign-ups of the caller's own clinic.
  @UseGuards(RolesGuard)
  @Roles(Role.CLINIC_STAFF)
  @Get('me/staff-requests')
  listStaffRequests(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<StaffRequestResponseDto[]> {
    return this.clinicService.listStaffRequests(user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLINIC_STAFF)
  @Patch('me/staff-requests/:userId')
  decideStaffRequest(
    @CurrentUser() user: AccessTokenPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: DecideStaffRequestDto,
  ): Promise<MessageResponseDto> {
    return this.clinicService.decideStaffRequest(user, userId, dto.decision);
  }

  @Public()
  @Get(':clinicId')
  findOne(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
  ): Promise<ClinicResponseDto> {
    return this.clinicService.findOne(clinicId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLINIC_STAFF)
  @Patch(':clinicId')
  update(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateClinicDto,
  ): Promise<ClinicResponseDto> {
    return this.clinicService.update(clinicId, user, dto);
  }

  // US-08: clinic photo (D64 who, D65 file rules).
  @UseGuards(RolesGuard)
  @Roles(Role.CLINIC_STAFF)
  @UseInterceptors(FileInterceptor('photo'))
  @Patch(':clinicId/photo')
  uploadPhoto(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @CurrentUser() user: AccessTokenPayload,
    @UploadedFile(ImageFilePipe) file: Express.Multer.File,
  ): Promise<{ url: string }> {
    return this.clinicService.uploadPhoto(clinicId, user, file);
  }
}
