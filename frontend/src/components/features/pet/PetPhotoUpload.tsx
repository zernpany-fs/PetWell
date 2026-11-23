'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera } from 'lucide-react';
import { uploadPetPhotoAction } from '@/lib/actions/pet.action';
import { validateImageUpload } from '@/lib/upload';

export default function PetPhotoUpload({ petId }: { petId: string }) {
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
      const r = await uploadPetPhotoAction(petId, fd);
      if (r.success) {
        toast.success(r.message ?? 'Photo updated.');
        router.refresh();
      } else toast.error(r.message);
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => ref.current?.click()}
        className="min-h-11 inline-flex items-center justify-center rounded-full px-4 py-2 bg-white/90 border-[1.5px] border-pw-primary text-pw-primary hover:bg-pw-primary-tint transition-colors flex items-center gap-2 disabled:opacity-60"
        style={{ fontSize: '13px' }}
      >
        <Camera size={14} /> {pending ? 'Uploading…' : 'Photo'}
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={onPick} />
    </>
  );
}
