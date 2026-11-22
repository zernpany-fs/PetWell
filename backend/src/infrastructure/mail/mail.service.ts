import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVariable } from '../../config/env.validation';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const RESEND_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'PetWell <onboarding@resend.dev>';

/**
 * D61: sends email through Resend when RESEND_API_KEY is set.
 * Without a key, `send` returns false and the caller decides what to log.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey?: string;
  private readonly from: string;

  constructor(config: ConfigService<EnvVariable, true>) {
    this.apiKey = config.get('RESEND_API_KEY', { infer: true }) || undefined;
    this.from = config.get('MAIL_FROM', { infer: true }) || DEFAULT_FROM;
  }

  get isConfigured(): boolean {
    return this.apiKey !== undefined;
  }

  /** Returns true if Resend accepted the email. Never throws. */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, ...message }),
      });
      if (!res.ok) {
        this.logger.error(`Resend rejected the email: ${res.status}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(`Could not reach Resend: ${String(error)}`);
      return false;
    }
  }
}
