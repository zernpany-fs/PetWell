/**
 * Integration tests (D48): denied cases of consent-based access, run on the
 * real services against the petwell_test database (D47).
 * HTTP-level checks (guards, roles) stay in scripts/v2_api_*_check.py.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RecordType, Role } from '@/database/generated/prisma/enums';
import { AccessTokenPayload } from '@/auth/types/jwt-payload';
import { hashShareCode } from './share-code';
import {
  createTestServices,
  expectStatus,
  resetDatabase,
} from '../../test/test-db';

const s = createTestServices();
const DAY_MS = 24 * 60 * 60 * 1000;
const yesterday = () => new Date(Date.now() - DAY_MS);
const nextWeek = () => new Date(Date.now() + 7 * DAY_MS);

const recordDto = {
  recordType: RecordType.TREATMENT,
  description: 'Check-up',
  recordDate: new Date('2026-11-01'),
};

let emailNo = 0;
async function makeUser(role: Role, clinicId: string | null = null) {
  emailNo += 1;
  return s.prisma.user.create({
    data: {
      firstName: `User${emailNo}`,
      lastName: 'Test',
      email: `user${emailNo}@test.local`,
      phone: `08000000${String(emailNo).padStart(2, '0')}`,
      password: 'not-used',
      role,
      clinicId,
    },
  });
}

const asStaff = (u: { id: string; email: string; clinicId: string | null }) =>
  ({
    sub: u.id,
    email: u.email,
    role: Role.CLINIC_STAFF,
    clinicId: u.clinicId,
  }) satisfies AccessTokenPayload;

/**
 * Clinic A is the clinic under test. Each pet is set up so that
 * clinic A has one specific kind of access (or none) to it.
 */
async function seed() {
  const clinic = (name: string) =>
    s.prisma.clinic.create({ data: { name, clinicType: 'GENERAL' } });
  const [clinicA, clinicB, clinicC, clinicD] = await Promise.all([
    clinic('Clinic A'),
    clinic('Clinic B'),
    clinic('Clinic C'),
    clinic('Clinic D'),
  ]);

  const owner = await makeUser(Role.OWNER);
  const otherOwner = await makeUser(Role.OWNER);
  const staffA = await makeUser(Role.CLINIC_STAFF, clinicA.id);
  const staffB = await makeUser(Role.CLINIC_STAFF, clinicB.id);
  const staffNoClinic = await makeUser(Role.CLINIC_STAFF, null);
  const staffC = await makeUser(Role.CLINIC_STAFF, clinicC.id);
  const staffD1 = await makeUser(Role.CLINIC_STAFF, clinicD.id);
  const staffD2 = await makeUser(Role.CLINIC_STAFF, clinicD.id);

  const pet = (name: string, isActive = true) =>
    s.prisma.pet.create({
      data: { name, species: 'Dog', ownerId: owner.id, isActive },
    });
  // NONE: no grant, no records by clinic A.
  const petNone = await pet('Nonepet');
  // AUTHORED_ONLY: clinic A wrote a record but has no grant.
  const petAuthored = await pet('Authoredpet');
  // Grant to clinic A that expired yesterday.
  const petExpired = await pet('Expiredpet');
  // Grant to clinic A that the owner revoked.
  const petRevoked = await pet('Revokedpet');
  // Archived pet, even though clinic A still has an active grant.
  const petArchived = await pet('Archivedpet', false);
  // FULL: active grant to clinic A (used for records of other clinics).
  const petFull = await pet('Fullpet');
  const otherOwnersPet = await s.prisma.pet.create({
    data: { name: 'Otherpet', species: 'Cat', ownerId: otherOwner.id },
  });

  const grantToA = (petId: string, extra: object = {}) =>
    s.prisma.petAccessGrant.create({
      data: { type: 'OWNER_SHARE', petId, clinicId: clinicA.id, ...extra },
    });
  await grantToA(petExpired.id, { expiresAt: yesterday() });
  await grantToA(petRevoked.id, { endedAt: yesterday(), endReason: 'REVOKED' });
  await grantToA(petArchived.id);
  await grantToA(petFull.id);

  const record = (
    petId: string,
    author: { id: string; clinicId: string | null },
    isActive = true,
  ) =>
    s.prisma.healthRecord.create({
      data: {
        ...recordDto,
        petId,
        clinicId: author.clinicId!,
        createdById: author.id,
        isActive,
      },
    });
  const recAOnAuthored = await record(petAuthored.id, staffA);
  const recBOnAuthored = await record(petAuthored.id, staffB);
  const recAArchived = await record(petAuthored.id, staffA, false);
  const recBOnFull = await record(petFull.id, staffB);

  // Share codes that must all be refused with the same 400 (D42).
  const secret = process.env['SHARE_CODE_SECRET']!;
  const shareCode = (code: string, petId: string, extra: object = {}) =>
    s.prisma.shareCode.create({
      data: {
        petId,
        codeHash: hashShareCode(code, secret),
        durationDays: 7,
        expiresAt: nextWeek(),
        ...extra,
      },
    });
  await shareCode('111111', petNone.id, { expiresAt: yesterday() });
  await shareCode('222222', petNone.id, { usedAt: yesterday() });
  await shareCode('333333', petArchived.id);

  // Lockouts (D14, D40): failures made just now.
  const failures = (userId: string, clinicId: string, count: number) =>
    s.prisma.shareCodeAttempt.createMany({
      data: Array.from({ length: count }, () => ({
        userId,
        clinicId,
        success: false,
      })),
    });
  await failures(staffC.id, clinicC.id, 5); // account limit
  await failures(staffD1.id, clinicD.id, 10); // clinic limit

  return {
    owner,
    otherOwner,
    staffA: asStaff(staffA),
    staffNoClinic: asStaff(staffNoClinic),
    staffC: asStaff(staffC),
    staffD2: asStaff(staffD2),
    petNone,
    petAuthored,
    petExpired,
    petRevoked,
    petArchived,
    otherOwnersPet,
    recAOnAuthored,
    recBOnAuthored,
    recAArchived,
    recBOnFull,
  };
}

let f: Awaited<ReturnType<typeof seed>>;

beforeAll(async () => {
  await resetDatabase(s.prisma);
  f = await seed();
});

afterAll(async () => {
  await s.prisma.$disconnect();
});

/** How many audit log rows exist for this pet (D32: denied views add none). */
const logCount = (petId: string) =>
  s.prisma.petAccessLog.count({ where: { petId } });

describe('GET /pets/:petId (clinic) — denied cases (D20, D32)', () => {
  it('no grant and no records of its own → 404, nothing logged', async () => {
    await expectStatus(s.pets.findOne(f.petNone.id, f.staffA), 404);
    expect(await logCount(f.petNone.id)).toBe(0);
  });

  it('grant expired → 404', async () => {
    await expectStatus(s.pets.findOne(f.petExpired.id, f.staffA), 404);
  });

  it('grant revoked by the owner → 404', async () => {
    await expectStatus(s.pets.findOne(f.petRevoked.id, f.staffA), 404);
  });

  it('archived pet, even with an active grant → 404', async () => {
    await expectStatus(s.pets.findOne(f.petArchived.id, f.staffA), 404);
  });

  it('staff not linked to a clinic → 404', async () => {
    await expectStatus(s.pets.findOne(f.petNone.id, f.staffNoClinic), 404);
  });

  it('AUTHORED_ONLY → id/name/species only, no owner contact (D9, D20)', async () => {
    const pet = await s.pets.findOne(f.petAuthored.id, f.staffA);
    expect(pet).toEqual({
      accessLevel: 'AUTHORED_ONLY',
      id: f.petAuthored.id,
      name: 'Authoredpet',
      species: 'Dog',
    });
  });
});

describe('GET /pets/:petId (owner) — denied cases', () => {
  it("another owner's pet → 404", async () => {
    const owner = {
      sub: f.owner.id,
      email: f.owner.email,
      role: Role.OWNER,
      clinicId: null,
    };
    await expectStatus(s.pets.findOne(f.otherOwnersPet.id, owner), 404);
  });
});

describe('health records — denied cases (D19, D35–D37)', () => {
  it('create with no access → 404', async () => {
    await expectStatus(
      s.records.create(f.petNone.id, f.staffA, recordDto),
      404,
    );
  });

  it('create with AUTHORED_ONLY → 403', async () => {
    await expectStatus(
      s.records.create(f.petAuthored.id, f.staffA, recordDto),
      403,
    );
  });

  it('create by staff not linked to a clinic → 403', async () => {
    await expectStatus(
      s.records.create(f.petNone.id, f.staffNoClinic, recordDto),
      403,
    );
  });

  it('list with no access → 404, nothing logged', async () => {
    await expectStatus(s.records.listByPet(f.petNone.id, f.staffA), 404);
    expect(await logCount(f.petNone.id)).toBe(0);
  });

  it('list with AUTHORED_ONLY → only its own active records (D11, D30)', async () => {
    const list = await s.records.listByPet(f.petAuthored.id, f.staffA);
    expect(list.map((r) => r.id)).toEqual([f.recAOnAuthored.id]);
  });

  it("read another clinic's record without a grant → 404 (closes v1 hole)", async () => {
    await expectStatus(s.records.findOne(f.recBOnAuthored.id, f.staffA), 404);
  });

  it('read its own archived record → 404 (D37)', async () => {
    await expectStatus(s.records.findOne(f.recAArchived.id, f.staffA), 404);
  });

  it("edit another clinic's record, even with FULL access → 403 (D19)", async () => {
    await expectStatus(
      s.records.update(f.recBOnFull.id, f.staffA, { description: 'x' }),
      403,
    );
  });

  it('edit its own archived record → 404 (D37)', async () => {
    await expectStatus(
      s.records.update(f.recAArchived.id, f.staffA, { description: 'x' }),
      404,
    );
  });
});

describe('GET /pets/search — what a clinic cannot find (D18, D38)', () => {
  const search = (q: string) => s.pets.search({ q }, f.staffA);

  it('pet with no access → not found by name', async () => {
    expect(await search('Nonepet')).toEqual([]);
  });

  it('AUTHORED_ONLY pet → not found by owner email (D38)', async () => {
    const found = await search(f.owner.email);
    expect(found.map((p) => p.id)).not.toContain(f.petAuthored.id);
  });

  it('AUTHORED_ONLY pet → found by name, without owner contact', async () => {
    expect(await search('Authoredpet')).toEqual([
      {
        accessLevel: 'AUTHORED_ONLY',
        id: f.petAuthored.id,
        name: 'Authoredpet',
        species: 'Dog',
      },
    ]);
  });
});

describe('POST /share-codes/redeem — denied cases (D7, D14, D40, D42)', () => {
  const failedAttempts = () =>
    s.prisma.shareCodeAttempt.count({
      where: { userId: f.staffA.sub, success: false },
    });

  it('wrong code → 400, failure recorded', async () => {
    const before = await failedAttempts();
    await expectStatus(s.shareCodes.redeem(f.staffA, '999999'), 400);
    expect(await failedAttempts()).toBe(before + 1);
  });

  it('expired code → 400', async () => {
    await expectStatus(s.shareCodes.redeem(f.staffA, '111111'), 400);
  });

  it('code already used → 400', async () => {
    await expectStatus(s.shareCodes.redeem(f.staffA, '222222'), 400);
  });

  it('code of an archived pet → 400', async () => {
    await expectStatus(s.shareCodes.redeem(f.staffA, '333333'), 400);
  });

  it('staff not linked to a clinic → 403', async () => {
    await expectStatus(s.shareCodes.redeem(f.staffNoClinic, '999999'), 403);
  });

  it('5 failures on this account in 15 minutes → 429', async () => {
    await expectStatus(s.shareCodes.redeem(f.staffC, '999999'), 429);
  });

  it('10 failures in this clinic in an hour → 429 for other staff too', async () => {
    await expectStatus(s.shareCodes.redeem(f.staffD2, '999999'), 429);
  });

  it('attempts while locked are not counted (D40)', async () => {
    const count = () =>
      s.prisma.shareCodeAttempt.count({ where: { userId: f.staffC.sub } });
    const before = await count();
    await expectStatus(s.shareCodes.redeem(f.staffC, '999999'), 429);
    expect(await count()).toBe(before);
  });
});
