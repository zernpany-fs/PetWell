import { Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';

@Module({
  imports: [NestJwtModule],
  exports: [NestJwtModule],
})
export class JwtModule {}
