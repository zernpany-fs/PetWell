/**
 * Integration tests (D48) on petwell_test (D47):
 * - appointment status → access grant (D1, D2, D4, D23)
 * - two status changes at the same moment (D31)
 * - audit log write failure (D34)
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { HttpException } from '@nestjs/common';
import { AppointmentStatus, Role } from '@/database/generated/prisma/enums';
import { AccessTokenPayload } from '@/auth/types/jwt-payload';
import { UpdateAppointmentStatusDto } from '@/appointment/dto/update-appointment-status.dto';
import {
  createTestServices,
  expectStatus,
  resetDatabase,
} from '../../test/test-db';

const s = createTestServices();
const DAY_MS = 24 * 60 * 60 * 1000;
const { PENDING, CONFIRMED, COMPLETED, REJECTED } = AppointmentStatus;

let clinicId: string;
let owner: AccessTokenPayload;
let staff1: AccessTokenPayload;
let staff2: AccessTokenPayload;

beforeAll(async () => {
  await resetDatabase(s.prisma);
  const clinic = await s.prisma.clinic.create({
    data: { name: 'Clinic A', clinicType: 'GENERAL' },
  });
  clinicId = clinic.id;
  const user = async (email: string, role: Role, cId: string | null) => {
    const u = await s.prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: email,
        email,
        password: 'not-used',
        role,
        clinicId: cId,
      },
    });
    return { sub: u.id, email, role, clinicId: cId };
  };
  owner = await user('owner@test.local', Role.OWNER, null);
  staff1 = await user('staff1@test.local', Role.CLINIC_STAFF, clinicId);
  staff2 = await user('staff2@test.local', Role.CLINIC_STAFF, clinicId);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await s.prisma.$disconnect();
});

/** A new pet with one appointment at clinic A in `status`. */
async function petWithAppointment(status: AppointmentStatus = PENDING) {
  const pet = await s.prisma.pet.create({
    data: { name: 'Testpet', species: 'Dog', ownerId: owner.sub },
  });
  const appointment = await s.prisma.appointment.create({
    data: {
      petId: pet.id,
      clinicId,
      appointmentDate: new Date(Date.now() + 3 * DAY_MS),
      status,
    },
  });
  return { pet, appointment };
}

const setStatus = (
  appointmentId: string,
  user: AccessTokenPayload,
  status: AppointmentStatus,
) =>
  s.appointments.updateStatus(appointmentId, user, {
    status,
  } as UpdateAppointmentStatusDto);

const grantOf = (appointmentId: string) =>
  s.prisma.petAccessGrant.findUnique({ where: { appointmentId } });

const statusLogCount = (appointmentId: string) =>
  s.prisma.appointmentStatusLog.count({ where: { appointmentId } });

/** Expects a plain error that NestJS turns into 500 (not a 4xx). */
async function expectServerError(promise: Promise<unknown>): Promise<void> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error, 'expected the request to fail').toBeInstanceOf(Error);
  expect(error).not.toBeInstanceOf(HttpException);
}

describe('appointment status → access grant (US-01, US-02)', () => {
  it('clinic confirms → active grant, clinic sees the pet (D1)', async () => {
    const { pet, appointment } = await petWithAppointment();
    await setStatus(appointment.id, staff1, CONFIRMED);

    const grant = await grantOf(appointment.id);
    expect(grant).toMatchObject({
      type: 'APPOINTMENT',
      clinicId,
      endedAt: null,
      expiresAt: null,
    });
    const seen = await s.pets.findOne(pet.id, staff1);
    expect(seen).toMatchObject({ accessLevel: 'FULL' });
  });

  it('completed → grant expires 30 days later (D2, D23)', async () => {
    const { appointment } = await petWithAppointment();
    await setStatus(appointment.id, staff1, CONFIRMED);
    const before = Date.now();
    await setStatus(appointment.id, staff1, COMPLETED);
    const after = Date.now();

    const expiresAt = (await grantOf(appointment.id))!.expiresAt!.getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 30 * DAY_MS);
    expect(expiresAt).toBeLessThanOrEqual(after + 30 * DAY_MS);
  });

  it('owner cancels a confirmed appointment → grant ends, pet is 404 (D4)', async () => {
    const { pet, appointment } = await petWithAppointment();
    await setStatus(appointment.id, staff1, CONFIRMED);
    await s.appointments.cancel(appointment.id, owner);

    expect(await grantOf(appointment.id)).toMatchObject({
      endReason: 'CANCELLED',
    });
    expect((await grantOf(appointment.id))!.endedAt).not.toBeNull();
    await expectStatus(s.pets.findOne(pet.id, staff1), 404);
  });

  it('rejected without ever being confirmed → no grant', async () => {
    const { pet, appointment } = await petWithAppointment();
    await setStatus(appointment.id, staff1, REJECTED);

    expect(await grantOf(appointment.id)).toBeNull();
    await expectStatus(s.pets.findOne(pet.id, staff1), 404);
  });
});

describe('two status changes at the same moment (D31)', () => {
  it('status changed after it was checked → 409, nothing written', async () => {
    const { appointment } = await petWithAppointment();
    // Staff 1 checked PENDING; then the owner cancelled before staff 1 wrote.
    const checked = { ...appointment, status: PENDING };
    await s.appointments.cancel(appointment.id, owner);
    const logsBefore = await statusLogCount(appointment.id);

    await expectStatus(
      s.prisma.$transaction((tx) =>
        s.appointments.changeStatusInTransaction(
          tx,
          checked,
          CONFIRMED,
          staff1.sub,
        ),
      ),
      409,
    );

    const now = await s.prisma.appointment.findUnique({
      where: { id: appointment.id },
    });
    expect(now!.status).toBe('CANCELLED');
    expect(await statusLogCount(appointment.id)).toBe(logsBefore);
    expect(await grantOf(appointment.id)).toBeNull(); // no grant from CONFIRMED
  });

  it('confirm and reject sent together → one wins, data matches the winner', async () => {
    // Repeat a few times: the order of the two requests is up to the DB.
    for (let round = 0; round < 5; round++) {
      const { appointment } = await petWithAppointment();
      const results = await Promise.allSettled([
        setStatus(appointment.id, staff1, CONFIRMED),
        setStatus(appointment.id, staff2, REJECTED),
      ]);

      const won = results.filter((r) => r.status === 'fulfilled');
      const lost = results.filter((r) => r.status === 'rejected');
      expect(won).toHaveLength(1);
      // 409 if both read PENDING (D31); 400 if the loser read the new status.
      const reason = (lost[0] as PromiseRejectedResult).reason;
      expect(reason).toBeInstanceOf(HttpException);
      expect([400, 409]).toContain((reason as HttpException).getStatus());

      const final = await s.prisma.appointment.findUnique({
        where: { id: appointment.id },
      });
      expect(await statusLogCount(appointment.id)).toBe(1);
      const grant = await grantOf(appointment.id);
      if (final!.status === CONFIRMED) expect(grant).not.toBeNull();
      else expect(grant).toBeNull();
    }
  });
});

describe('audit log write fails (D34)', () => {
  /** A pet clinic A can see in full, with one record by clinic A. */
  async function fullPetWithRecord() {
    const pet = await s.prisma.pet.create({
      data: { name: 'Loggedpet', species: 'Cat', ownerId: owner.sub },
    });
    await s.prisma.petAccessGrant.create({
      data: { type: 'OWNER_SHARE', petId: pet.id, clinicId },
    });
    const record = await s.prisma.healthRecord.create({
      data: {
        petId: pet.id,
        clinicId,
        createdById: staff1.sub,
        recordType: 'VACCINE',
        description: 'Rabies',
        recordDate: new Date('2026-11-01'),
      },
    });
    return { pet, record };
  }

  const breakLog = () =>
    vi
      .spyOn(s.access, 'logAccess')
      .mockRejectedValue(new Error('log write failed'));

  it('open the pet → 500, no data returned', async () => {
    const { pet } = await fullPetWithRecord();
    breakLog();
    await expectServerError(s.pets.findOne(pet.id, staff1));
  });

  it('list health records → 500, no data returned', async () => {
    const { pet } = await fullPetWithRecord();
    breakLog();
    await expectServerError(s.records.listByPet(pet.id, staff1));
  });

  it('read one health record → 500, no data returned', async () => {
    const { record } = await fullPetWithRecord();
    breakLog();
    await expectServerError(s.records.findOne(record.id, staff1));
  });

  it('same requests work again once the log works (control)', async () => {
    const { pet } = await fullPetWithRecord();
    const seen = await s.pets.findOne(pet.id, staff1);
    expect(seen).toMatchObject({ accessLevel: 'FULL' });
    expect(
      await s.prisma.petAccessLog.count({ where: { petId: pet.id } }),
    ).toBe(1);
  });
});
