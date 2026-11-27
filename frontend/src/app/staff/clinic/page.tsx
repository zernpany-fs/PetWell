import { Metadata } from 'next';
import { getSessionUser } from '@/lib/session';
import { ClinicApi } from '@/lib/api/clinic.api';
import ClinicProfileForm from '@/components/features/clinic/ClinicProfileForm';
import ClinicPhoto from '@/components/features/clinic/ClinicPhoto';
import ClinicPhotoUpload from '@/components/features/clinic/ClinicPhotoUpload';
import StaffRequests from '@/components/features/clinic/StaffRequests';

export const metadata: Metadata = { title: 'Clinic Profile' };

export default async function ClinicProfilePage() {
  const user = await getSessionUser();
  const clinic = user?.clinicId
    ? await ClinicApi.get(user.clinicId).catch(() => null)
    : null;
  // US-09 (D76): null = the list could not be loaded.
  const staffRequests = clinic
    ? await ClinicApi.listStaffRequests().catch(() => null)
    : null;

  return (
    <div className="pw-fade max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h2
        className="font-display text-pw-ink mb-6"
        style={{ fontSize: '26px' }}
      >
        Clinic Profile
      </h2>
      {clinic && (
        <div className="relative mb-6 rounded-2xl overflow-hidden border border-pw-line shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
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
      <div className="bg-white border border-pw-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
        {clinic ? (
          <ClinicProfileForm clinic={clinic} />
        ) : (
          <p className="text-pw-muted" style={{ fontSize: '14px' }}>
            Your account isn&apos;t linked to a clinic.
          </p>
        )}
      </div>
      {clinic && (
        <section className="mt-6 bg-white border border-pw-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
          <h3 className="font-display text-pw-ink mb-1">Staff requests</h3>
          <p className="text-pw-muted mb-4" style={{ fontSize: '13px' }}>
            People who signed up as staff of this clinic. They can log in only
            after someone here approves them.
          </p>
          {staffRequests ? (
            <StaffRequests requests={staffRequests} />
          ) : (
            <p className="text-pw-danger" style={{ fontSize: '14px' }}>
              Could not load staff requests. Reload the page to try again.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
