'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Building2, CalendarCheck, KeyRound } from 'lucide-react';
import { revokeClinicAccessAction } from '@/lib/actions/access.action';
import { AccessGrant } from '@/lib/api/api.type';

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
    ? `until ${format(new Date(g.expiresAt), 'd MMM yyyy')}`
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
  const groups = groupByClinic(grants);

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
      <p className="text-[#6E675C]" style={{ fontSize: '14px' }}>
        No clinic can see these records right now.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[#E6DFD3]">
      {groups.map(({ clinic, grants }) => (
        <li key={clinic.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[#2D2A26]">
                <Building2 size={15} className="text-[#5E86AD]" />
                {clinic.name}
              </p>
              {grants.map((g) => (
                <p
                  key={g.id}
                  className="flex items-center gap-1.5 text-[#6E675C] mt-0.5"
                  style={{ fontSize: '13px' }}
                >
                  {g.type === 'APPOINTMENT' ? (
                    <CalendarCheck size={13} />
                  ) : (
                    <KeyRound size={13} />
                  )}
                  {describeGrant(g)}
                </p>
              ))}
            </div>
            {confirming !== clinic.id && (
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming(clinic.id)}
                className="shrink-0 rounded-full px-3 py-1.5 bg-[#FEF2F2] border border-[#FECACA] text-[#C4534E] hover:bg-[#FEE2E2] transition-colors disabled:opacity-60"
                style={{ fontSize: '12px', minHeight: '36px' }}
              >
                Revoke
              </button>
            )}
          </div>
          {confirming === clinic.id && (
            <div
              role="alert"
              className="mt-2 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3"
              style={{ fontSize: '13px' }}
            >
              <p className="text-[#2D2A26]">
                Revoke {clinic.name}&apos;s access? They will only see records
                they wrote. Your appointments with them are not cancelled.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => revoke(clinic.id)}
                  className="rounded-full px-4 py-1.5 bg-[#C4534E] text-white hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? 'Revoking…' : 'Yes, revoke'}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirming(null)}
                  className="rounded-full px-4 py-1.5 bg-white border border-[#E6DFD3] text-[#2D2A26]"
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
