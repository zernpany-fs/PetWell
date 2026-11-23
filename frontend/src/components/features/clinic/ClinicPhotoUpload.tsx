'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera } from 'lucide-react';
import { uploadClinicPhotoAction } from '@/lib/actions/clinic.action';
import { validateImageUpload } from '@/lib/upload';

/** US-08: staff change their clinic's photo from Clinic Profile. */
export default function ClinicPhotoUpload({ clinicId }: { clinicId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const problem = validateImageUpload(file);
    if (problem) {
      toast.error(problem);
      e.target.value = '';
      return;
    }
    const fd = new FormData();
    fd.append('photo', file);
    startTransition(async () => {
      const r = await uploadClinicPhotoAction(clinicId, fd);
      if (r.success) {
        toast.success(r.message ?? 'Photo updated.');
        router.refresh();
      } else toast.error(r.message);
    });
    e.target.value = '';
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => ref.current?.click()}
        className="rounded-full px-4 py-2 bg-white/90 border-[1.5px] border-pw-primary text-pw-primary hover:bg-pw-primary-tint transition-colors flex items-center gap-2 disabled:opacity-60"
        style={{ fontSize: '13px' }}
      >
        <Camera size={14} /> {pending ? 'Uploading…' : 'Change photo'}
      </button>
      <input
        ref={ref}
        data-testid="clinic-photo-input"
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
      />
    </>
  );
}
