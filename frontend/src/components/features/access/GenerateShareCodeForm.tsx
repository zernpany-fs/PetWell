'use client';

import { useEffect, useState, useTransition } from 'react';
import { formatAppTime } from '@/lib/datetime';
import { KeyRound, Timer } from 'lucide-react';
import { generateShareCodeAction } from '@/lib/actions/access.action';
import { ShareCodeResponse } from '@/lib/api/api.type';
import {
  DEFAULT_SHARE_DURATION,
  SHARE_DURATION_OPTIONS,
} from '@/lib/schemas/access.schema';

type Duration = (typeof SHARE_DURATION_OPTIONS)[number]['value'];

/** Seconds from now until `iso`, never below 0. */
function secondsUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
}

/** 754 → "12:34" */
function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function durationLabel(days: number | null): string {
  return days === null ? 'unlimited access' : `${days} days of access`;
}

/**
 * US-03 AC1 + D51: the owner picks how long a clinic may see the pet,
 * gets a 6-digit code, and reads it out at the clinic. The code is shown
 * once with a countdown; at 0 it is hidden (it no longer works).
 */
export default function GenerateShareCodeForm({ petId }: { petId: string }) {
  const [pending, startTransition] = useTransition();
  const [duration, setDuration] = useState<Duration>(DEFAULT_SHARE_DURATION);
  const [shareCode, setShareCode] = useState<ShareCodeResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tick once a second while a code is on screen.
  useEffect(() => {
    if (!shareCode) return;
    const tick = () => {
      const left = secondsUntil(shareCode.expiresAt);
      setSecondsLeft(left);
      if (left === 0) {
        setShareCode(null); // hide the code: it no longer works (D7)
        setExpired(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [shareCode]);

  function generate() {
    setError(null);
    setExpired(false);
    startTransition(async () => {
      const r = await generateShareCodeAction(petId, {
        durationDays: duration,
      });
      if (r.success) setShareCode(r.shareCode);
      else setError(r.message);
    });
  }

  if (shareCode) {
    return (
      <div className="bg-[#F7F4EE] border border-[#E6DFD3] rounded-xl p-4 text-center">
        <p className="text-[#6E675C]" style={{ fontSize: '13px' }}>
          Read this code to the clinic staff
        </p>
        <p
          aria-label="Share code"
          className="font-mono text-[#2D2A26] tracking-[0.4em] my-2"
          style={{ fontSize: '34px' }}
        >
          {shareCode.code}
        </p>
        <p
          className="flex items-center justify-center gap-1.5 text-[#96701D]"
          style={{ fontSize: '13px' }}
        >
          <Timer size={13} />
          Expires in {formatCountdown(secondsLeft)} (at{' '}
          {formatAppTime(shareCode.expiresAt, 'HH:mm')})
        </p>
        <p className="text-[#6E675C] mt-1" style={{ fontSize: '13px' }}>
          Works once and gives the clinic{' '}
          {durationLabel(shareCode.durationDays)}. This code will not be shown
          again.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[#2D2A26] mb-2" style={{ fontSize: '14px' }}>
        How long can the clinic see the record?
      </p>
      <div
        role="radiogroup"
        aria-label="Access duration"
        className="flex flex-wrap gap-2 mb-4"
      >
        {SHARE_DURATION_OPTIONS.map((o) => {
          const selected = o.value === duration;
          return (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setDuration(o.value)}
              className={`rounded-full px-4 py-1.5 border-[1.5px] transition-colors ${
                selected
                  ? 'bg-[#5E86AD] border-[#5E86AD] text-white'
                  : 'bg-white border-[#E6DFD3] text-[#2D2A26] hover:border-[#5E86AD]'
              }`}
              style={{ fontSize: '13px' }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={generate}
        disabled={pending}
        className="pw-btn-primary rounded-full px-6 flex items-center gap-2"
        style={{ minHeight: '44px' }}
      >
        <KeyRound size={15} />
        {pending
          ? 'Creating…'
          : expired
            ? 'Generate new code'
            : 'Generate share code'}
      </button>
      {expired && (
        <p className="mt-2 text-[#6E675C]" style={{ fontSize: '13px' }}>
          The last code expired. Generate a new one when you are at the clinic.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-2 text-[#C4534E]"
          style={{ fontSize: '13px' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
