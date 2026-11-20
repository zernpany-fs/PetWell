import { Module } from '@nestjs/common';
import { AccessService } from './access.service';
import { ShareCodeService } from './share-code.service';
import { OwnerAccessService } from './owner-access.service';
import { AccessController } from './access.controller';

// PrismaService comes from the global DatabaseModule and ConfigService from
// the global ConfigModule, so no imports needed.
// Pet, health-record and appointment modules import this module.
@Module({
  controllers: [AccessController],
  providers: [AccessService, ShareCodeService, OwnerAccessService],
  exports: [AccessService],
})
export class AccessModule {}
