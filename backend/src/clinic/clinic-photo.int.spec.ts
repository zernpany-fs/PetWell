/**
 * Integration tests (D48) on petwell_test (D47) for US-08, clinic photo
 * (D64). Cloudinary is replaced by a fake that returns a fixed URL.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Role } from '../database/generated/prisma/enums';
import { PrismaService } from '../database/prisma.service';
import { CloudinaryService } from '../infrastructure/upload/cloudinary.service';
import { EnvVariable } from '../config/env.validation';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { ClinicService } from './clinic.service';
import { expectStatus, resetDatabase } from '../../test/test-db';

const config = {
  get: (key: string) => process.env[key],
} as unknown as ConfigService<EnvVariable, true>;

const NEW_URL = 'https://res.cloudinary.com/demo/new-clinic.jpg';
let uploads = 0;
const fakeCloudinary = {
  upload: async () => {
    uploads += 1;
    return NEW_URL;
  },
} as unknown as CloudinaryService;

const prisma = new PrismaService(config);
const service = new ClinicService(prisma, fakeCloudinary);

const photo = {
  mimetype: 'image/jpeg',
  size: 1024,
  buffer: Buffer.alloc(1),
} as Express.Multer.File;

let clinicA: string;
let clinicB: string;

function staffOf(clinicId: string): AccessTokenPayload {
  return {
    sub: '00000000-0000-4000-8000-000000000001',
    email: 'staff@test.local',
    role: Role.CLINIC_STAFF,
    clinicId,
  } as AccessTokenPayload;
}

async function photoOf(clinicId: string): Promise<string | null> {
  const c = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
  return c.photoUrl;
}

beforeAll(async () => {
  await resetDatabase(prisma);
});

beforeEach(async () => {
  await prisma.clinic.deleteMany({ where: { name: { startsWith: 'Photo ' } } });
  clinicA = (
    await prisma.clinic.create({
      data: { name: 'Photo A', clinicType: 'GENERAL', photoUrl: null },
    })
  ).id;
  clinicB = (
    await prisma.clinic.create({
      data: { name: 'Photo B', clinicType: 'EXOTIC', photoUrl: 'old-b.jpg' },
    })
  ).id;
  uploads = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('US-08 clinic photo', () => {
  it('AC1: staff sets the photo of their own clinic', async () => {
    const result = await service.uploadPhoto(clinicA, staffOf(clinicA), photo);

    expect(result).toEqual({ url: NEW_URL });
    expect(await photoOf(clinicA)).toBe(NEW_URL);
  });

  it('AC1: a new upload replaces the old photo (D64)', async () => {
    await service.uploadPhoto(clinicB, staffOf(clinicB), photo);
    expect(await photoOf(clinicB)).toBe(NEW_URL);
  });

  it('AC2: staff of another clinic gets 403, nothing uploaded or changed', async () => {
    await expectStatus(
      service.uploadPhoto(clinicB, staffOf(clinicA), photo),
      403,
    );
    expect(await photoOf(clinicB)).toBe('old-b.jpg');
    expect(uploads).toBe(0);
  });

  it('unknown clinic -> 404, nothing uploaded', async () => {
    const missing = '00000000-0000-4000-8000-0000000000ff';
    await expectStatus(
      service.uploadPhoto(missing, staffOf(missing), photo),
      404,
    );
    expect(uploads).toBe(0);
  });
});
