/**
 * Integration tests (D48) on petwell_test (D47) for US-09, staff approval
 * (D72–D76). Real UserService, AuthService and ClinicService; the token
 * signer and Cloudinary are not under test.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Role, StaffStatus } from '../database/generated/prisma/enums';
import { PrismaService } from '../database/prisma.service';
import { BcryptService } from '../infrastructure/hash/bcrypt.service';
import { EnvVariable } from '../config/env.validation';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { AccessTokenService } from '../auth/access-token.service';
import {
  AuthService,
  STAFF_PENDING_MESSAGE,
  STAFF_REJECTED_MESSAGE,
} from '../auth/auth.service';
import { UserService } from '../user/user.service';
import { ClinicService } from './clinic.service';
import { expectStatus, resetDatabase } from '../../test/test-db';

const config = {
  get: (key: string) => process.env[key],
} as unknown as ConfigService<EnvVariable, true>;
const unused = new Proxy({} as never, {
  get: () => {
    throw new Error('This dependency is not set up in integration tests');
  },
});
const fakeTokens = {
  sign: async () => 'test-token',
} as unknown as AccessTokenService;

const prisma = new PrismaService(config);
const bcrypt = new BcryptService();
const users = new UserService(prisma, bcrypt, unused);
const auth = new AuthService(users, bcrypt, fakeTokens);
const clinics = new ClinicService(prisma, unused);

const PASSWORD = 'pass1234';
let clinicA: string;
let clinicB: string;
let approverA: AccessTokenPayload;
let approverB: AccessTokenPayload;

async function signUp(email: string, clinicId: string): Promise<string> {
  await auth.registerClinicStaff({
    firstName: 'New',
    lastName: 'Staff',
    email,
    password: PASSWORD,
    clinicId,
  } as never);
  const u = await prisma.user.findUniqueOrThrow({ where: { email } });
  return u.id;
}

async function approvedStaff(
  email: string,
  clinicId: string,
): Promise<AccessTokenPayload> {
  const u = await prisma.user.create({
    data: {
      firstName: 'Approved',
      lastName: 'Staff',
      email,
      password: await bcrypt.hash(PASSWORD),
      role: Role.CLINIC_STAFF,
      clinicId,
      staffStatus: StaffStatus.APPROVED,
    },
  });
  return { sub: u.id, email, role: Role.CLINIC_STAFF, clinicId } as never;
}

function statusOf(id: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    select: { staffStatus: true, staffDecidedById: true },
  });
}

beforeAll(async () => {
  await resetDatabase(prisma);
});

beforeEach(async () => {
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@approve.local' } },
  });
  await prisma.clinic.deleteMany({
    where: { name: { startsWith: 'Approve ' } },
  });
  clinicA = (
    await prisma.clinic.create({
      data: { name: 'Approve A', clinicType: 'GENERAL' },
    })
  ).id;
  clinicB = (
    await prisma.clinic.create({
      data: { name: 'Approve B', clinicType: 'EXOTIC' },
    })
  ).id;
  approverA = await approvedStaff('a-boss@approve.local', clinicA);
  approverB = await approvedStaff('b-boss@approve.local', clinicB);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('US-09 staff approval', () => {
  it('AC1: a staff sign-up is PENDING with no decision yet (D73)', async () => {
    const id = await signUp('new@approve.local', clinicA);
    expect(await statusOf(id)).toEqual({
      staffStatus: StaffStatus.PENDING,
      staffDecidedById: null,
    });
  });

  it('AC1: an owner sign-up has no staff status', async () => {
    await auth.register({
      firstName: 'O',
      lastName: 'Wner',
      email: 'owner@approve.local',
      password: PASSWORD,
    } as never);
    const u = await prisma.user.findUniqueOrThrow({
      where: { email: 'owner@approve.local' },
    });
    expect(u.staffStatus).toBeNull();
  });

  it('AC2: pending staff with the right password get 403 and no token (D74)', async () => {
    await signUp('new@approve.local', clinicA);
    const p = auth.login({ email: 'new@approve.local', password: PASSWORD });
    await expectStatus(p, 403);
    await expect(
      auth.login({ email: 'new@approve.local', password: PASSWORD }),
    ).rejects.toThrow(STAFF_PENDING_MESSAGE);
  });

  it('AC2: a wrong password still gets 401, not the status (D74)', async () => {
    await signUp('new@approve.local', clinicA);
    await expectStatus(
      auth.login({ email: 'new@approve.local', password: 'wrongpass1' }),
      401,
    );
  });

  it("AC3: staff see only their own clinic's pending requests, oldest first (D76)", async () => {
    const first = await signUp('first@approve.local', clinicA);
    const second = await signUp('second@approve.local', clinicA);
    await signUp('other@approve.local', clinicB);
    const list = await clinics.listStaffRequests(approverA);
    expect(list.map((r) => r.id)).toEqual([first, second]);
    expect(Object.keys(list[0]).sort()).toEqual(
      ['createdAt', 'email', 'firstName', 'id', 'lastName', 'phone'].sort(),
    );
  });

  it('AC4: approved staff can log in; the decider is recorded (D73, D76)', async () => {
    const id = await signUp('new@approve.local', clinicA);
    await clinics.decideStaffRequest(approverA, id, 'APPROVE');
    expect(await statusOf(id)).toEqual({
      staffStatus: StaffStatus.APPROVED,
      staffDecidedById: approverA.sub,
    });
    const res = await auth.login({
      email: 'new@approve.local',
      password: PASSWORD,
    });
    expect(res.access_token).toBe('test-token');
    expect(await clinics.listStaffRequests(approverA)).toEqual([]);
  });

  it('AC5: rejected staff cannot log in and the email stays taken (D74, D75)', async () => {
    const id = await signUp('new@approve.local', clinicA);
    await clinics.decideStaffRequest(approverA, id, 'REJECT');
    expect((await statusOf(id)).staffStatus).toBe(StaffStatus.REJECTED);
    await expectStatus(
      auth.login({ email: 'new@approve.local', password: PASSWORD }),
      403,
    );
    await expect(
      auth.login({ email: 'new@approve.local', password: PASSWORD }),
    ).rejects.toThrow(STAFF_REJECTED_MESSAGE);
    await expectStatus(signUp('new@approve.local', clinicA), 409);
  });

  it("AC6: another clinic's request or an unknown id gets 404 and nothing changes (D76)", async () => {
    const id = await signUp('new@approve.local', clinicA);
    await expectStatus(
      clinics.decideStaffRequest(approverB, id, 'APPROVE'),
      404,
    );
    await expectStatus(
      clinics.decideStaffRequest(
        approverA,
        '00000000-0000-4000-8000-000000000099',
        'APPROVE',
      ),
      404,
    );
    // An approved staff member is not a request either.
    await expectStatus(
      clinics.decideStaffRequest(approverA, approverA.sub, 'REJECT'),
      409,
    );
    expect(await statusOf(id)).toEqual({
      staffStatus: StaffStatus.PENDING,
      staffDecidedById: null,
    });
  });

  it('AC6: a decided request gets 409 and keeps its first decision (D76)', async () => {
    const id = await signUp('new@approve.local', clinicA);
    await clinics.decideStaffRequest(approverA, id, 'APPROVE');
    const second = await approvedStaff('a-second@approve.local', clinicA);
    await expectStatus(clinics.decideStaffRequest(second, id, 'REJECT'), 409);
    expect(await statusOf(id)).toEqual({
      staffStatus: StaffStatus.APPROVED,
      staffDecidedById: approverA.sub,
    });
  });

  it('AC6: two staff deciding at the same moment: exactly one wins (D76)', async () => {
    const id = await signUp('new@approve.local', clinicA);
    const second = await approvedStaff('a-second@approve.local', clinicA);
    const results = await Promise.allSettled([
      clinics.decideStaffRequest(approverA, id, 'APPROVE'),
      clinics.decideStaffRequest(second, id, 'REJECT'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('AC7: an account with no clinic (an owner) gets 403', async () => {
    const owner = {
      sub: approverA.sub,
      role: Role.OWNER,
      clinicId: null,
    } as never;
    await expectStatus(clinics.listStaffRequests(owner), 403);
    await expectStatus(
      clinics.decideStaffRequest(owner, approverA.sub, 'APPROVE'),
      403,
    );
  });
});
