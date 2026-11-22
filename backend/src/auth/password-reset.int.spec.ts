/**
 * Integration tests (D48) on petwell_test (D47) for US-07, password reset
 * (D55–D59). Email is replaced by a fake that keeps the sent links.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Role } from '../database/generated/prisma/enums';
import { PrismaService } from '../database/prisma.service';
import { BcryptService } from '../infrastructure/hash/bcrypt.service';
import { MailMessage, MailService } from '../infrastructure/mail/mail.service';
import { EnvVariable } from '../config/env.validation';
import { PasswordResetService } from './password-reset.service';
import {
  INVALID_RESET_LINK_MESSAGE,
  RESET_TOKEN_TTL_MS,
} from './password-reset';
import { expectStatus, resetDatabase } from '../../test/test-db';

const config = {
  get: (key: string) =>
    key === 'FRONTEND_URL' ? 'http://petwell.test' : process.env[key],
} as unknown as ConfigService<EnvVariable, true>;

const sent: MailMessage[] = [];
const fakeMail = {
  isConfigured: true,
  send: async (m: MailMessage) => {
    sent.push(m);
    return true;
  },
} as unknown as MailService;

const prisma = new PrismaService(config);
const bcrypt = new BcryptService();
const service = new PasswordResetService(prisma, bcrypt, fakeMail, config);

const EMAIL = 'reset@test.local';
let userId: string;

/** The token inside the most recent email. */
function lastToken(): string {
  const match = sent.at(-1)?.text.match(/token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error('no reset email was sent');
  return match[1];
}

async function canLogIn(password: string): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return bcrypt.compare(password, user.password);
}

beforeAll(async () => {
  await resetDatabase(prisma);
});

beforeEach(async () => {
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany({
    where: { email: { endsWith: '@test.local' } },
  });
  const user = await prisma.user.create({
    data: {
      firstName: 'Reset',
      lastName: 'Tester',
      email: EMAIL,
      password: await bcrypt.hash('oldpass1'),
      role: Role.OWNER,
    },
  });
  userId = user.id;
  sent.length = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('US-07 forgot password', () => {
  it('AC2: emails a link to an active account and stores only a hash', async () => {
    await service.requestReset(EMAIL);

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(EMAIL);
    expect(sent[0].text).toContain('http://petwell.test/reset-password?token=');
    const token = lastToken();
    const rows = await prisma.passwordResetToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toContain(token);
    const ttl = rows[0].expiresAt.getTime() - rows[0].createdAt.getTime();
    expect(ttl).toBe(RESET_TOKEN_TTL_MS); // 30 minutes (D56)
  });

  it('AC1: an unknown email sends nothing and does not fail (D57)', async () => {
    await expect(
      service.requestReset('nobody@test.local'),
    ).resolves.toBeUndefined();
    expect(sent).toHaveLength(0);
  });

  it('AC6: an inactive account gets no link (D55)', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    await service.requestReset(EMAIL);
    expect(sent).toHaveLength(0);
  });

  it('AC5: at most 3 links per hour; the 4th sends nothing (D58)', async () => {
    for (let i = 0; i < 4; i++) await service.requestReset(EMAIL);
    expect(sent).toHaveLength(3);
  });

  it('AC5: the limit counts a rolling hour', async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    for (let i = 0; i < 3; i++) await service.requestReset(EMAIL, twoHoursAgo);
    await service.requestReset(EMAIL);
    expect(sent).toHaveLength(4);
  });
});

describe('US-07 reset password', () => {
  it('AC3: a valid link changes the password once', async () => {
    await service.requestReset(EMAIL);
    const token = lastToken();

    await service.resetPassword(token, 'newpass2');

    expect(await canLogIn('newpass2')).toBe(true);
    expect(await canLogIn('oldpass1')).toBe(false);
    await expectStatus(service.resetPassword(token, 'again33'), 400);
    expect(await canLogIn('newpass2')).toBe(true);
  });

  it('AC4: an expired link is refused and nothing changes', async () => {
    const past = new Date(Date.now() - RESET_TOKEN_TTL_MS - 1000);
    await service.requestReset(EMAIL, past);

    await expectStatus(service.resetPassword(lastToken(), 'newpass2'), 400);
    expect(await canLogIn('oldpass1')).toBe(true);
  });

  it('AC4: a link replaced by a newer one is refused (D56)', async () => {
    await service.requestReset(EMAIL);
    const first = lastToken();
    await service.requestReset(EMAIL);
    const second = lastToken();

    await expectStatus(service.resetPassword(first, 'newpass2'), 400);
    await service.resetPassword(second, 'newpass3');
    expect(await canLogIn('newpass3')).toBe(true);
  });

  it('AC4: a made-up token gets the same message (D59)', async () => {
    const error = await service
      .resetPassword('not-a-real-token', 'newpass2')
      .catch((e: Error) => e);
    expect((error as Error).message).toBe(INVALID_RESET_LINK_MESSAGE);
  });

  it('AC4: a link stops working if the account is made inactive', async () => {
    await service.requestReset(EMAIL);
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    await expectStatus(service.resetPassword(lastToken(), 'newpass2'), 400);
  });

  it('two requests with the same link at once: only one changes the password', async () => {
    await service.requestReset(EMAIL);
    const token = lastToken();

    const results = await Promise.allSettled([
      service.resetPassword(token, 'raceone1'),
      service.resetPassword(token, 'racetwo2'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const winner = (await canLogIn('raceone1')) ? 'raceone1' : 'racetwo2';
    expect(await canLogIn(winner)).toBe(true);
  });
});
