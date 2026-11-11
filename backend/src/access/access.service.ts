import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { Prisma } from '@/database/generated/prisma/client';
import {
  AccessType,
  AppointmentStatus,
} from '@/database/generated/prisma/enums';
import { AccessLevel, resolveAccessLevel } from './access-level';
import { decideGrantChange } from './grant-decision';

export type AccessLogEntry = {
  userId: string;
  clinicId: string;
  petId: string;
  grantId: string | null; // null = viewing only its own records (D24)
};

export type AppointmentRef = {
  id: string;
  petId: string;
  clinicId: string;
};

const NO_ACCESS: AccessLevel = { level: 'NONE' };

/**
 * Single place for consent-based access: checks what a clinic may see,
 * writes the audit log, and keeps appointment grants in step with
 * appointment status. Used by pet, health-record and appointment.
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** What clinic `clinicId` may see of pet `petId` right now (D20). */
  async getClinicAccess(
    clinicId: string | null,
    petId: string,
    now: Date = new Date(),
  ): Promise<AccessLevel> {
    // Staff without a clinic has no access to anything.
    if (!clinicId) return NO_ACCESS;

    const [grants, authoredCount] = await Promise.all([
      // Ended grants can never count, so skip them in the query.
      // Expiry is checked in resolveAccessLevel.
      this.prisma.petAccessGrant.findMany({
        where: { petId, clinicId, endedAt: null },
        select: { id: true, endedAt: true, expiresAt: true, createdAt: true },
      }),
      // D30: only active records count as authored.
      this.prisma.healthRecord.count({
        where: { petId, clinicId, isActive: true },
      }),
    ]);

    return resolveAccessLevel(grants, authoredCount > 0, now);
  }

  /** Audit log: one row each time a clinic opens a pet (D10, D24). */
  async logAccess(entry: AccessLogEntry): Promise<void> {
    await this.prisma.petAccessLog.create({ data: entry });
  }

  /**
   * Updates the grant of `appointment` after its status became `newStatus`.
   * Must run inside the same $transaction as the status change, so pass
   * the transaction client `tx` (flowchart: succeed or fail together).
   */
  async applyAppointmentStatusChange(
    tx: Prisma.TransactionClient,
    appointment: AppointmentRef,
    newStatus: AppointmentStatus,
    now: Date = new Date(),
  ): Promise<void> {
    const grant = await tx.petAccessGrant.findUnique({
      where: { appointmentId: appointment.id },
      select: { id: true, endedAt: true, expiresAt: true },
    });

    const change = decideGrantChange(newStatus, grant, now);

    switch (change.action) {
      case 'CREATE':
        await tx.petAccessGrant.create({
          data: {
            type: AccessType.APPOINTMENT,
            petId: appointment.petId,
            clinicId: appointment.clinicId,
            appointmentId: appointment.id,
          },
        });
        return;

      case 'SET_EXPIRY':
        await tx.petAccessGrant.update({
          where: { appointmentId: appointment.id },
          data: { expiresAt: change.expiresAt },
        });
        return;

      case 'END':
        await tx.petAccessGrant.update({
          where: { appointmentId: appointment.id },
          data: { endedAt: now, endReason: change.endReason },
        });
        return;

      case 'NONE':
        return;
    }
  }
}
