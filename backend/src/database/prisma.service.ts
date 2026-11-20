import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { EnvVariable } from '@/config/env.validation';
import { PrismaClient } from './generated/prisma/client';
import { PG_SESSION_OPTIONS } from './pg-options';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {
    const adapter = new PrismaPg({
      connectionString: configService.get('DATABASE_URL', { infer: true }),
      options: PG_SESSION_OPTIONS, // D46: store timestamps in UTC
    });
    super({ adapter });
  }
}
