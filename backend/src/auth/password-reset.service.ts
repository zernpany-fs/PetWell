import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { BcryptService } from '../infrastructure/hash/bcrypt.service';
import { MailService } from '../infrastructure/mail/mail.service';
import { EnvVariable } from '../config/env.validation';
import {
  INVALID_RESET_LINK_MESSAGE,
  RESET_REQUEST_LIMIT,
  RESET_REQUEST_WINDOW_MS,
  RESET_TOKEN_TTL_MS,
  generateResetToken,
  hashResetToken,
  resetLink,
} from './password-reset';

/** US-07: forgot / reset password by an emailed link (D55–D61). */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly bcrypt: BcryptService,
    private readonly mail: MailService,
    config: ConfigService<EnvVariable, true>,
  ) {
    this.frontendUrl =
      config.get('FRONTEND_URL', { infer: true }) ?? 'http://localhost:3000';
  }

  /**
   * US-07 AC1, AC2, AC5, AC6. Returns nothing on purpose: the controller
   * answers the same way whatever happens here (D57).
   */
  async requestReset(email: string, now = new Date()): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return; // D55

    // D58: at most 3 links per account per rolling hour.
    const recent = await this.prisma.passwordResetToken.count({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(now.getTime() - RESET_REQUEST_WINDOW_MS) },
      },
    });
    if (recent >= RESET_REQUEST_LIMIT) return;

    const token = generateResetToken();
    await this.prisma.$transaction([
      // D56: one live link at a time; older unused links stop working.
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashResetToken(token),
          expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
          createdAt: now,
        },
      }),
    ]);

    await this.deliver(user.email, user.firstName, token);
  }

  /** US-07 AC3, AC4 (D56, D59). */
  async resetPassword(
    token: string,
    password: string,
    now = new Date(),
  ): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
      include: { user: { select: { isActive: true } } },
    });
    if (
      !record ||
      record.usedAt !== null ||
      record.expiresAt <= now ||
      !record.user.isActive
    ) {
      throw new BadRequestException(INVALID_RESET_LINK_MESSAGE);
    }

    const passwordHash = await this.bcrypt.hash(password);
    await this.prisma.$transaction(async (tx) => {
      // Compare-and-set (like D31): if two requests use the same link at
      // once, only the first one changes the password.
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException(INVALID_RESET_LINK_MESSAGE);
      }
      await tx.user.update({
        where: { id: record.userId },
        data: { password: passwordHash },
      });
      // D56: a successful reset ends every other link of the account.
      await tx.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: now },
      });
    });
  }

  /** D61: email through Resend, or log the link outside production. */
  private async deliver(
    to: string,
    firstName: string,
    token: string,
  ): Promise<void> {
    const link = resetLink(this.frontendUrl, token);
    if (this.mail.isConfigured) {
      const sent = await this.mail.send({
        to,
        subject: 'Reset your PetWell password',
        text: `Hi ${firstName},\n\nOpen this link to choose a new password. It works once and expires in 30 minutes:\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
        html: `<p>Hi ${escapeHtml(firstName)},</p><p>Open this link to choose a new password. It works once and expires in 30 minutes:</p><p><a href="${link}">Reset my password</a></p><p>If you did not ask for this, you can ignore this email.</p>`,
      });
      if (!sent) this.logger.error('Reset email was not sent');
      return;
    }
    if (process.env.NODE_ENV === 'production') {
      this.logger.warn(
        'Email is not configured (RESEND_API_KEY); reset link not sent',
      );
      return;
    }
    this.logger.log(`Password reset link for ${to}: ${link}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
