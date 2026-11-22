import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenService } from './access-token.service';
import { UserModule } from '../user/user.module';
import { JwtModule } from '../infrastructure/jwt/jwt.module';
import { HashModule } from '../infrastructure/hash/hash.module';
import { MailModule } from '../infrastructure/mail/mail.module';
import { PasswordResetService } from './password-reset.service';

@Module({
  imports: [UserModule, JwtModule, HashModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenService, PasswordResetService],
  exports: [AccessTokenService],
})
export class AuthModule {}
