import { Module } from '@nestjs/common';
import { AccessService } from './access.service';

// PrismaService comes from the global DatabaseModule, so no imports needed.
// Pet, health-record and appointment modules import this module.
@Module({
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
