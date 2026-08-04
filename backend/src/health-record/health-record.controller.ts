import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HealthRecordService } from './health-record.service';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { HealthRecordResponseDto } from './dto/health-record-response.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Role } from '@/database/generated/prisma/enums';
import { MessageResponseDto } from '@/common/dto/message-response.dto';
import type { AccessTokenPayload } from '@/auth/types/jwt-payload';

@Controller()
export class HealthRecordController {
  constructor(private readonly healthRecordService: HealthRecordService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.CLINIC_STAFF)
  @Post('pets/:petId/health-records')
  create(
    @Param('petId', ParseUUIDPipe) petId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateHealthRecordDto,
  ): Promise<HealthRecordResponseDto> {
    return this.healthRecordService.create(petId, user, dto);
  }

  @Get('pets/:petId/health-records')
  listByPet(
    @Param('petId', ParseUUIDPipe) petId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<HealthRecordResponseDto[]> {
    return this.healthRecordService.listByPet(petId, user);
  }

  @Get('health-records/:recordId')
  findOne(
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<HealthRecordResponseDto> {
    return this.healthRecordService.findOne(recordId, user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLINIC_STAFF)
  @Patch('health-records/:recordId')
  update(
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateHealthRecordDto,
  ): Promise<HealthRecordResponseDto> {
    return this.healthRecordService.update(recordId, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLINIC_STAFF)
  @UseInterceptors(FileInterceptor('file'))
  @Post('health-records/:recordId/attachments')
  uploadAttachment(
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @CurrentUser() user: AccessTokenPayload,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    return this.healthRecordService.uploadAttachment(recordId, user, file);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLINIC_STAFF)
  @Delete('health-records/:recordId')
  archive(
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<MessageResponseDto> {
    return this.healthRecordService.archive(recordId, user);
  }
}
