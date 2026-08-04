import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenService } from './access-token.service';
import { UserModule } from '@/user/user.module';
import { JwtModule } from '@/infrastructure/jwt/jwt.module';
import { HashModule } from '@/infrastructure/hash/hash.module';

@Module({
  imports: [UserModule, JwtModule, HashModule],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenService],
  exports: [AccessTokenService],
})
export class AuthModule {}
