'use client';

import { useState, useTransition } from 'react';
import { formatAppTime } from '@/lib/datetime';
import { toast } from 'sonner';
import { Building2, CalendarCheck, KeyRound } from 'lucide-react';
import {
  extendGrantAction,
  revokeClinicAccessAction,
} from '@/lib/actions/access.action';
import { AccessGrant } from '@/lib/api/api.type';
import {
  DEFAULT_SHARE_DURATION,
  SHARE_DURATION_OPTIONS,
} from '@/lib/schemas/access.schema';

type Duration = (typeof SHARE_DURATION_OPTIONS)[number]['value'];
type ClinicGroup = { clinic: AccessGrant['clinic']; grants: AccessGrant[] };

/** Revoke works per clinic (D12), so show one row per clinic. */
function groupByClinic(grants: AccessGrant[]): ClinicGroup[] {
  const map = new Map<string, ClinicGroup>();
  for (const g of grants) {
    const group = map.get(g.clinic.id) ?? { clinic: g.clinic, grants: [] };
    group.grants.push(g);
    map.set(g.clinic.id, group);
  }
  return [...map.values()];
}

/** Why the clinic has access and until when, in plain words. */
function describeGrant(g: AccessGrant): string {
  const until = g.expiresAt
    ? `until ${formatAppTime(g.expiresAt, 'd MMM yyyy')}`
    : null;
  if (g.type === 'APPOINTMENT') {
    // null = the visit is not completed yet; access ends 30 days after (D2).
    return `From an appointment · ${until ?? 'until 30 days after the visit'}`;
  }
  return `Shared by code · ${until ?? 'no end date'}`;
}

/**
 * US-04 AC1–AC2 + D52: clinics that can see the pet now, one row per
 * clinic. Revoke asks for confirmation in the row (no browser dialog)
 * and ends both kinds of access; the appointment itself stays.
 */
export default function ClinicAccessList({
  petId,
  grants,
}: {
  petId: string;
  grants: AccessGrant[];
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState<Duration>(
    DEFAULT_SHARE_DURATION,
  );
  const groups = groupByClinic(grants);

  function startEdit(grantId: string) {
    setConfirming(null);
    setEditDuration(DEFAULT_SHARE_DURATION);
    setEditing(grantId);
  }

  function extend(grantId: string) {
    startTransition(async () => {
      const r = await extendGrantAction(petId, grantId, {
        durationDays: editDuration,
      });
      setEditing(null);
      if (r.success) toast.success(r.message ?? 'Access updated.');
      else toast.error(r.message);
    });
  }

  function revoke(clinicId: string) {
    startTransition(async () => {
      const r = await revokeClinicAccessAction(petId, clinicId);
      setConfirming(null);
      if (r.success) toast.success(r.message ?? 'Access revoked.');
      else toast.error(r.message);
    });
  }

  if (groups.length === 0) {
    return (
      <p className="text-pw-muted" style={{ fontSize: '14px' }}>
        No clinic can see these records right now.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-pw-line">
      {groups.map(({ clinic, grants }) => (
        <li key={clinic.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-pw-ink">
                <Building2 size={15} className="text-pw-primary" />
                {clinic.name}
              </p>
              {grants.map((g) => (
                <div key={g.id}>
                  <p
                    className="flex flex-wrap items-center gap-1.5 text-pw-muted mt-0.5"
                    style={{ fontSize: '13px' }}
                  >
                    {g.type === 'APPOINTMENT' ? (
                      <CalendarCheck size={13} />
                    ) : (
                      <KeyRound size={13} />
                    )}
                    {describeGrant(g)}
                    {/* D27: only owner shares can be changed, by the owner. */}
                    {g.type === 'OWNER_SHARE' && editing !== g.id && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => startEdit(g.id)}
                        className="text-pw-primary underline underline-offset-2 hover:text-pw-primary-strong-2"
                      >
                        Change
                      </button>
                    )}
                  </p>
                  {editing === g.id && (
                    <div
                      className="mt-2 flex flex-wrap items-center gap-2"
                      style={{ fontSize: '12px' }}
                    >
                      <span className="text-pw-muted">From now:</span>
                      {SHARE_DURATION_OPTIONS.map((o) => (
                        <button
                          key={o.label}
                          type="button"
                          role="radio"
                          aria-checked={o.value === editDuration}
                          onClick={() => setEditDuration(o.value)}
                          className={`rounded-full px-3 py-1 border ${
                            o.value === editDuration
                              ? 'bg-pw-primary border-pw-primary text-white'
                              : 'bg-white border-pw-line text-pw-ink'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => extend(g.id)}
                        className="min-h-11 inline-flex items-center justify-center pw-btn-primary rounded-full px-3 py-1"
                      >
                        {pending ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setEditing(null)}
                        className="min-h-11 inline-flex items-center justify-center rounded-full px-3 py-1 bg-white border border-pw-line text-pw-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {confirming !== clinic.id && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setEditing(null);
                  setConfirming(clinic.id);
                }}
                className="min-h-11 inline-flex items-center justify-center shrink-0 rounded-full px-3 py-1.5 bg-pw-danger-tint border border-pw-danger-line text-pw-danger hover:bg-pw-danger-tint-2 transition-colors disabled:opacity-60"
                style={{ fontSize: '12px' }}
              >
                Revoke
              </button>
            )}
          </div>
          {confirming === clinic.id && (
            <div
              role="alert"
              className="mt-2 bg-pw-danger-tint border border-pw-danger-line rounded-xl p-3"
              style={{ fontSize: '13px' }}
            >
              <p className="text-pw-ink">
                Revoke {clinic.name}&apos;s access? They will only see records
                they wrote. Your appointments with them are not cancelled.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => revoke(clinic.id)}
                  className="min-h-11 inline-flex items-center justify-center rounded-full px-4 py-1.5 bg-pw-danger text-white hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? 'Revoking…' : 'Yes, revoke'}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirming(null)}
                  className="min-h-11 inline-flex items-center justify-center rounded-full px-4 py-1.5 bg-white border border-pw-line text-pw-ink"
                >
                  Keep access
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
