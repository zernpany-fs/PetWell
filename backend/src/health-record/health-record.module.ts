import { Module } from '@nestjs/common';
import { HealthRecordController } from './health-record.controller';
import { HealthRecordService } from './health-record.service';
import { UploadModule } from '@/infrastructure/upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [HealthRecordController],
  providers: [HealthRecordService],
  exports: [HealthRecordService],
})
export class HealthRecordModule {}
