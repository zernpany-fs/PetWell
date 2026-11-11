import { Module } from '@nestjs/common';
import { PetController } from './pet.controller';
import { PetService } from './pet.service';
import { UploadModule } from '@/infrastructure/upload/upload.module';
import { AppointmentModule } from '@/appointment/appointment.module';

@Module({
  imports: [UploadModule, AppointmentModule],
  controllers: [PetController],
  providers: [PetService],
  exports: [PetService],
})
export class PetModule {}
