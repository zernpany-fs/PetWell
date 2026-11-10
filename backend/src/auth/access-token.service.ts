import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EnvVariable } from '@/config/env.validation';
import { AccessTokenPayload } from './types/jwt-payload';

@Injectable()
export class AccessTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  sign(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('ACCESS_TOKEN_SECRET', { infer: true }),
      expiresIn: this.configService.get('ACCESS_TOKEN_EXPIRES_IN', {
        infer: true,
      }),
    });
  }

  verify(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get('ACCESS_TOKEN_SECRET', { infer: true }),
    });
  }
}
