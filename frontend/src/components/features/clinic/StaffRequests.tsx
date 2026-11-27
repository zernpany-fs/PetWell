'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { UserRound } from 'lucide-react';
import { formatAppTime } from '@/lib/datetime';
import { decideStaffRequestAction } from '@/lib/actions/staff-request.action';
import { StaffDecision, StaffRequest } from '@/lib/api/api.type';

/**
 * US-09 AC3–AC5 (D72, D76): people who signed up as staff of this clinic.
 * Approve lets them log in; Reject asks for confirmation in the row (no
 * browser dialog) because a rejected account cannot sign up again (D75).
 */
export default function StaffRequests({
  requests,
}: {
  requests: StaffRequest[];
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);

  function decide(userId: string, decision: StaffDecision) {
    startTransition(async () => {
      const r = await decideStaffRequestAction(userId, decision);
      setConfirming(null);
      if (r.success) toast.success(r.message ?? 'Saved.');
      else toast.error(r.message);
    });
  }

  if (requests.length === 0) {
    return (
      <p className="text-pw-muted" style={{ fontSize: '14px' }}>
        No one is waiting to join this clinic.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-pw-line">
      {requests.map((r) => (
        <li key={r.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-pw-ink">
                <UserRound size={15} className="text-pw-primary" />
                {r.firstName} {r.lastName}
              </p>
              <p
                className="text-pw-muted mt-0.5"
                style={{ fontSize: '13px', overflowWrap: 'anywhere' }}
              >
                {r.email}
                {r.phone ? ` · ${r.phone}` : ''} · signed up{' '}
                {formatAppTime(r.createdAt, 'd MMM yyyy')}
              </p>
            </div>
            {confirming !== r.id && (
              <div className="flex shrink-0 gap-2" style={{ fontSize: '12px' }}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => decide(r.id, 'APPROVE')}
                  className="min-h-11 inline-flex items-center justify-center pw-btn-primary rounded-full px-3 py-1.5 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirming(r.id)}
                  className="min-h-11 inline-flex items-center justify-center rounded-full px-3 py-1.5 bg-pw-danger-tint border border-pw-danger-line text-pw-danger hover:bg-pw-danger-tint-2 transition-colors disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
          {confirming === r.id && (
            <div
              role="alert"
              className="mt-2 bg-pw-danger-tint border border-pw-danger-line rounded-xl p-3"
              style={{ fontSize: '13px' }}
            >
              <p className="text-pw-ink">
                Reject {r.firstName} {r.lastName}? They will not be able to log
                in, and this email cannot be used to sign up again.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => decide(r.id, 'REJECT')}
                  className="min-h-11 inline-flex items-center justify-center rounded-full px-3 py-1 bg-pw-danger text-white disabled:opacity-60"
                >
                  {pending ? 'Rejecting…' : 'Yes, reject'}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirming(null)}
                  className="min-h-11 inline-flex items-center justify-center rounded-full px-3 py-1 bg-white border border-pw-line text-pw-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
