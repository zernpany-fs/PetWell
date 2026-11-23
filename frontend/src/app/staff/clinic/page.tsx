import { Metadata } from 'next';
import { getSessionUser } from '@/lib/session';
import { ClinicApi } from '@/lib/api/clinic.api';
import ClinicProfileForm from '@/components/features/clinic/ClinicProfileForm';
import ClinicPhoto from '@/components/features/clinic/ClinicPhoto';
import ClinicPhotoUpload from '@/components/features/clinic/ClinicPhotoUpload';

export const metadata: Metadata = { title: 'Clinic Profile' };

export default async function ClinicProfilePage() {
  const user = await getSessionUser();
  const clinic = user?.clinicId
    ? await ClinicApi.get(user.clinicId).catch(() => null)
    : null;

  return (
    <div className="pw-fade max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h2
        className="font-display text-[#2D2A26] mb-6"
        style={{ fontSize: '26px' }}
      >
        Clinic Profile
      </h2>
      {clinic && (
        <div className="relative mb-6 rounded-2xl overflow-hidden border border-[#E6DFD3] shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
          <ClinicPhoto
            photoUrl={clinic.photoUrl}
            name={clinic.name}
            className="w-full h-48"
            sizes="(max-width: 640px) 100vw, 576px"
            priority
          />
          <div className="absolute top-3 right-3">
            <ClinicPhotoUpload clinicId={clinic.id} />
          </div>
        </div>
      )}
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
        {clinic ? (
          <ClinicProfileForm clinic={clinic} />
        ) : (
          <p className="text-[#6E675C]" style={{ fontSize: '14px' }}>
            Your account isn&apos;t linked to a clinic.
          </p>
        )}
      </div>
    </div>
  );
}
