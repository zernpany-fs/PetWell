// D70 vaccine reminders and D71 upcoming appointments on the owner dashboard.
// Days are Thai calendar days, whatever time zone the server runs in.
import { describe, expect, it } from 'vitest';
import { Appointment, HealthRecord } from '../api/api.type';
import { getUpcomingAppointments, getVaccineReminders } from '../dashboard';

// 22:00 on 27 Nov 2026 in Bangkok = 15:00 UTC.
const NOW = new Date('2026-11-27T15:00:00.000Z');
const pets = [
  { id: 'p1', name: 'Milo' },
  { id: 'p2', name: 'Bua' },
];

function record(over: Partial<HealthRecord>): HealthRecord {
  return {
    id: 'r',
    petId: 'p1',
    clinicId: 'c',
    createdById: 'u',
    appointmentId: null,
    recordType: 'VACCINE',
    description: 'Rabies',
    recordDate: '2025-12-01T00:00:00.000Z',
    nextDueDate: null,
    attachments: [],
    isActive: true,
    createdAt: '2025-12-01T00:00:00.000Z',
    updatedAt: '2025-12-01T00:00:00.000Z',
    ...over,
  };
}

function appt(over: Partial<Appointment>): Appointment {
  return {
    id: 'a',
    petId: 'p1',
    clinicId: 'c',
    status: 'CONFIRMED',
    notes: null,
    appointmentDate: '2026-11-30T03:00:00.000Z',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...over,
  };
}

describe('getVaccineReminders (D70)', () => {
  it('includes vaccines due from today up to 14 days ahead, soonest first', () => {
    const result = getVaccineReminders(
      pets,
      {
        p1: [
          record({ id: 'in14', nextDueDate: '2026-12-11T00:00:00.000Z' }),
          record({ id: 'today', nextDueDate: '2026-11-27T00:00:00.000Z' }),
        ],
        p2: [
          record({
            id: 'in3',
            petId: 'p2',
            nextDueDate: '2026-11-30T00:00:00.000Z',
          }),
        ],
      },
      NOW,
    );
    expect(result.map((r) => [r.recordId, r.daysLeft, r.petName])).toEqual([
      ['today', 0, 'Milo'],
      ['in3', 3, 'Bua'],
      ['in14', 14, 'Milo'],
    ]);
  });

  it('leaves out day 15, overdue, treatments, archived and records with no due date', () => {
    const result = getVaccineReminders(
      pets,
      {
        p1: [
          record({ id: 'in15', nextDueDate: '2026-12-12T00:00:00.000Z' }),
          record({ id: 'overdue', nextDueDate: '2026-11-26T00:00:00.000Z' }),
          record({
            id: 'treat',
            recordType: 'TREATMENT',
            nextDueDate: '2026-11-30T00:00:00.000Z',
          }),
          record({
            id: 'archived',
            isActive: false,
            nextDueDate: '2026-11-30T00:00:00.000Z',
          }),
          record({ id: 'none', nextDueDate: null }),
        ],
      },
      NOW,
    );
    expect(result).toEqual([]);
  });
});

describe('getUpcomingAppointments (D71)', () => {
  it('keeps open appointments from today on, soonest first', () => {
    const result = getUpcomingAppointments(
      [
        appt({ id: 'mon', appointmentDate: '2026-11-30T03:00:00.000Z' }),
        appt({
          id: 'today9am',
          status: 'PENDING',
          appointmentDate: '2026-11-27T02:00:00.000Z',
        }),
        appt({
          id: 'resched',
          status: 'RESCHEDULED',
          appointmentDate: '2026-11-28T03:00:00.000Z',
        }),
      ],
      NOW,
    );
    expect(result.map((a) => a.id)).toEqual(['today9am', 'resched', 'mon']);
  });

  it('drops open appointments from past days and closed ones', () => {
    const result = getUpcomingAppointments(
      [
        appt({ id: 'yesterday', appointmentDate: '2026-11-26T03:00:00.000Z' }),
        appt({ id: 'done', status: 'COMPLETED' }),
        appt({ id: 'cancelled', status: 'CANCELLED' }),
      ],
      NOW,
    );
    expect(result).toEqual([]);
  });
});
