/**
 * Helpers for integration tests that use the petwell_test database (D47, D48).
 * test/setup-env.ts has already checked that DATABASE_URL is petwell_test.
 */
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { expect } from 'vitest';
import { PrismaService } from '@/database/prisma.service';
import { EnvVariable } from '@/config/env.validation';
import { AccessService } from '@/access/access.service';
import { ShareCodeService } from '@/access/share-code.service';
import { PetService } from '@/pet/pet.service';
import { HealthRecordService } from '@/health-record/health-record.service';
import { AppointmentService } from '@/appointment/appointment.service';

type Config = ConfigService<EnvVariable, true>;

/** Reads values from process.env (.env.test), like ConfigModule does. */
const testConfig = {
  get: (key: string) => process.env[key],
} as unknown as Config;

export type TestServices = {
  prisma: PrismaService;
  access: AccessService;
  pets: PetService;
  records: HealthRecordService;
  shareCodes: ShareCodeService;
  appointments: AppointmentService;
};

/**
 * Builds the real services on a real PrismaService.
 * Cloudinary (and AppointmentService inside PetService, used only by
 * archive) are not used by the methods under test;
 * the placeholder throws if a test ever reaches them by mistake.
 */
export function createTestServices(): TestServices {
  const prisma = new PrismaService(testConfig);
  const access = new AccessService(prisma);
  const unused = new Proxy({} as never, {
    get: () => {
      throw new Error('This dependency is not set up in integration tests');
    },
  });
  return {
    prisma,
    access,
    pets: new PetService(prisma, unused, unused, access),
    records: new HealthRecordService(prisma, unused, access),
    shareCodes: new ShareCodeService(prisma, testConfig),
    appointments: new AppointmentService(prisma, access),
  };
}

/** Empties every table. Safe only because setup-env.ts checked the DB name. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  // CASCADE also empties every table that points at users or clinics.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "users", "clinics" CASCADE');
}

/** Expects `promise` to fail with an HTTP error of `status` (e.g. 404). */
export async function expectStatus(
  promise: Promise<unknown>,
  status: number,
): Promise<void> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error, `expected HTTP ${status}, but it succeeded`).toBeInstanceOf(
    HttpException,
  );
  expect((error as HttpException).getStatus()).toBe(status);
}
