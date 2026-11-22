'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { redeemShareCodeAction } from '@/lib/actions/access.action';

/**
 * US-03: a walk-in owner reads out a 6-digit code; staff enter it here
 * and are taken to the pet once the clinic has access.
 */
export default function RedeemShareCodeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    startTransition(async () => {
      const r = await redeemShareCodeAction({ code });
      if (r.success) {
        toast.success(r.message);
        setCode('');
        router.push(`/staff/pets/${r.petId}`);
      } else {
        setError(r.message);
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-[#E6DFD3] rounded-2xl p-5 mb-6"
    >
      <div className="flex items-center gap-2 mb-1">
        <KeyRound size={16} className="text-[#5E86AD]" />
        <p className="text-[#2D2A26]" style={{ fontSize: '15px' }}>
          Walk-in with a share code?
        </p>
      </div>
      <p className="text-[#6E675C] mb-3" style={{ fontSize: '13px' }}>
        Ask the owner for their 6-digit share code. A code works once and
        expires 15 minutes after the owner creates it.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          aria-label="Share code"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
          }
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          className="flex-1 h-12 px-4 bg-white border border-[#E6DFD3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E86AD] text-[#2D2A26] placeholder:text-[#A39B8D] tracking-[0.4em] font-mono"
        />
        <button
          type="submit"
          disabled={pending}
          className="pw-btn-primary rounded-full px-6"
          style={{ minHeight: '48px' }}
        >
          {pending ? 'Checking…' : 'Get access'}
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-2 text-[#C4534E]"
          style={{ fontSize: '13px' }}
        >
          {error}
        </p>
      )}
    </form>
  );
}
