import { Metadata } from 'next';
import { authFetch } from '@/lib/api/auth-fetch';
import { UserResponse } from '@/lib/api/api.type';
import ProfileForm from '@/components/features/user/ProfileForm';

export const metadata: Metadata = { title: 'Profile' };

export default async function OwnerProfilePage() {
  const user = await authFetch<UserResponse>('/auth/me');
  return (
    <div className="pw-fade max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h2 className="font-display text-[#2D2A26] mb-6" style={{ fontSize: '26px' }}>
        Your Profile
      </h2>
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
        <ProfileForm user={user} showAddress />
      </div>
    </div>
  );
}
