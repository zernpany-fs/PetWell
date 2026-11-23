'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera } from 'lucide-react';
import { UserResponse } from '@/lib/api/api.type';
import { updateProfileAction, uploadAvatarAction } from '@/lib/actions/user.action';
import { FormInput } from '@/components/features/auth/FormInput';
import { validateImageUpload } from '@/lib/upload';
import { THAI_PROVINCES } from '@/lib/constants/provinces';

export default function ProfileForm({
  user,
  showAddress = false,
}: {
  user: UserResponse;
  showAddress?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [f, setF] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? '',
    addressLine: user.addressLine ?? '',
    subdistrict: user.subdistrict ?? '',
    district: user.district ?? '',
    province: user.province ?? '',
    postalCode: user.postalCode ?? '',
  });

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  function save() {
    const payload = showAddress
      ? f
      : {
          firstName: f.firstName,
          lastName: f.lastName,
          phone: f.phone,
        };
    startTransition(async () => {
      const r = await updateProfileAction(payload);
      if (r.success) {
        toast.success(r.message ?? 'Saved.');
        router.refresh();
      } else toast.error(r.message);
    });
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const problem = validateImageUpload(file);
    if (problem) {
      toast.error(problem);
      e.target.value = '';
      return;
    }
    const fd = new FormData();
    fd.append('avatar', file);
    startUpload(async () => {
      const r = await uploadAvatarAction(fd);
      if (r.success) {
        toast.success(r.message ?? 'Photo updated.');
        router.refresh();
      } else toast.error(r.message);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt=""
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-pw-primary text-white flex items-center justify-center text-lg select-none">
              {initials}
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded-full px-4 py-2 bg-white border-[1.5px] border-pw-primary text-pw-primary hover:bg-pw-primary-tint transition-colors flex items-center gap-2 disabled:opacity-60"
            style={{ fontSize: '14px' }}
          >
            <Camera size={15} /> {uploading ? 'Uploading…' : 'Change photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
          <p className="text-pw-muted mt-1" style={{ fontSize: '12px' }}>{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormInput label="First name" value={f.firstName} onChange={set('firstName')} />
        <FormInput label="Last name" value={f.lastName} onChange={set('lastName')} />
      </div>
      <FormInput label="Phone" value={f.phone} onChange={set('phone')} />

      {showAddress && (
        <div className="pt-2 border-t border-pw-line space-y-4">
          <div>
            <h3 className="text-pw-ink" style={{ fontSize: '15px' }}>
              Address
            </h3>
            <p className="text-pw-muted mt-0.5" style={{ fontSize: '12px' }}>
              Optional. Leave any field blank to remove it.
            </p>
          </div>

          <FormInput
            label="Address (house no., village, lane, road)"
            value={f.addressLine}
            onChange={set('addressLine')}
            placeholder="123/4 หมู่ 5 ซอยสุขุมวิท 21 ถนนสุขุมวิท"
          />

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Subdistrict"
              value={f.subdistrict}
              onChange={set('subdistrict')}
              placeholder="แขวง / ตำบล"
            />
            <FormInput
              label="District"
              value={f.district}
              onChange={set('district')}
              placeholder="เขต / อำเภอ"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-pw-ink mb-1.5"
                style={{ fontSize: '13px' }}
              >
                Province
              </label>
              <select
                value={f.province}
                onChange={set('province')}
                className="w-full h-12 px-4 bg-white border border-pw-line rounded-xl focus:outline-none focus:ring-2 focus:ring-pw-primary focus:border-pw-primary transition-colors text-pw-ink"
              >
                <option value="">Select a province</option>
                {f.province &&
                  !THAI_PROVINCES.includes(
                    f.province as (typeof THAI_PROVINCES)[number],
                  ) && <option value={f.province}>{f.province}</option>}
                {THAI_PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>

            <FormInput
              label="Postal code"
              value={f.postalCode}
              onChange={set('postalCode')}
              inputMode="numeric"
              maxLength={5}
              placeholder="10110"
              error={
                f.postalCode && !/^\d{5}$/.test(f.postalCode)
                  ? 'Must be 5 digits.'
                  : undefined
              }
            />
          </div>
        </div>
      )}

      <button disabled={pending} onClick={save} className="pw-btn-primary rounded-full px-6" style={{ minHeight: '44px' }}>
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
