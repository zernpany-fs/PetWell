import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { AppointmentStatusLogResponseDto } from './dto/appointment-status-log-response.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { DayAvailabilityResponseDto } from './dto/slot-availability-response.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Role } from '@/database/generated/prisma/enums';
import { MessageResponseDto } from '@/common/dto/message-response.dto';
import type { AccessTokenPayload } from '@/auth/types/jwt-payload';

@Controller()
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  @Post('appointments')
  create(
    @CurrentUser('sub') ownerId: string,
    @Body() dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.create(ownerId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  @Get('appointments')
  listMine(
    @CurrentUser('sub') ownerId: string,
  ): Promise<AppointmentResponseDto[]> {
    return this.appointmentService.listByOwner(ownerId);
  }

  @Get('clinics/:clinicId/availability')
  getAvailability(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Query() query: AvailabilityQueryDto,
  ): Promise<DayAvailabilityResponseDto> {
    return this.appointmentService.getDayAvailability(clinicId, query);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLINIC_STAFF)
  @Get('clinics/:clinicId/appointments')
  listByClinic(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AppointmentResponseDto[]> {
    return this.appointmentService.listByClinic(clinicId, user);
  }

  @Get('appointments/:appointmentId')
  findOne(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.findOne(appointmentId, user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLINIC_STAFF)
  @Patch('appointments/:appointmentId/status')
  updateStatus(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateAppointmentStatusDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.updateStatus(appointmentId, user, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  @Delete('appointments/:appointmentId')
  cancel(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<MessageResponseDto> {
    return this.appointmentService.cancel(appointmentId, user);
  }

  @Get('appointments/:appointmentId/logs')
  getLogs(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<AppointmentStatusLogResponseDto[]> {
    return this.appointmentService.getLogs(appointmentId, user);
  }
}
