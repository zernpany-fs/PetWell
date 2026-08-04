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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PetService } from './pet.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { PetResponseDto } from './dto/pet-response.dto';
import { PetSearchResultDto } from './dto/pet-search-result.dto';
import { SearchPetQueryDto } from './dto/search-pet-query.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Role } from '@/database/generated/prisma/enums';
import type { AccessTokenPayload } from '@/auth/types/jwt-payload';
import { MessageResponseDto } from '@/common/dto/message-response.dto';

@Controller('pets')
export class PetController {
  constructor(private readonly petService: PetService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  @Post()
  create(
    @CurrentUser('sub') ownerId: string,
    @Body() dto: CreatePetDto,
  ): Promise<PetResponseDto> {
    return this.petService.create(ownerId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  @Get()
  list(@CurrentUser('sub') ownerId: string): Promise<PetResponseDto[]> {
    return this.petService.listByOwner(ownerId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.CLINIC_STAFF)
  @Get('search')
  search(@Query() query: SearchPetQueryDto): Promise<PetSearchResultDto[]> {
    return this.petService.search(query);
  }

  @Get(':petId')
  findOne(
    @CurrentUser() user: AccessTokenPayload,
    @Param('petId', ParseUUIDPipe) petId: string,
  ): Promise<PetResponseDto> {
    return this.petService.findOne(petId, user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  @Patch(':petId')
  update(
    @CurrentUser('sub') ownerId: string,
    @Param('petId', ParseUUIDPipe) petId: string,
    @Body() dto: UpdatePetDto,
  ): Promise<PetResponseDto> {
    return this.petService.update(petId, ownerId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  @UseInterceptors(FileInterceptor('photo'))
  @Patch(':petId/photo')
  uploadPhoto(
    @CurrentUser('sub') ownerId: string,
    @Param('petId', ParseUUIDPipe) petId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    return this.petService.uploadPhoto(petId, ownerId, file);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  @Delete(':petId')
  archive(
    @CurrentUser('sub') ownerId: string,
    @Param('petId', ParseUUIDPipe) petId: string,
  ): Promise<MessageResponseDto> {
    return this.petService.archive(petId, ownerId);
  }
}
