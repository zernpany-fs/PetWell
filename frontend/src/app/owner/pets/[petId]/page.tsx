import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatAppTime } from '@/lib/datetime';
import Image from 'next/image';
import { Syringe, Stethoscope, Building2, Pencil } from 'lucide-react';
import { PetApi } from '@/lib/api/pet.api';
import { HealthRecordApi } from '@/lib/api/health-record.api';
import { HealthRecord } from '@/lib/api/api.type';
import { PhotoPlaceholder } from '@/components/shared/PhotoPlaceholder';
import PetPhotoUpload from '@/components/features/pet/PetPhotoUpload';
import GenerateShareCodeForm from '@/components/features/access/GenerateShareCodeForm';
import ClinicAccessList from '@/components/features/access/ClinicAccessList';
import { AccessApi } from '@/lib/api/access.api';
import { AccessGrant } from '@/lib/api/api.type';

export default async function PetProfilePage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = await params;
  const pet = await PetApi.get(petId).catch(() => null);
  if (!pet) notFound();
  const [records, grants] = await Promise.all([
    HealthRecordApi.listByPet(petId).catch((): HealthRecord[] => []),
    AccessApi.listGrants(petId).catch((): AccessGrant[] => []),
  ]);

  return (
    <div className="pw-fade max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="bg-white border border-pw-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
        {/* h-48 has to live here: a filled Image is absolute, so without a
            height on the wrapper the banner would collapse to nothing. */}
        <div className="relative h-48">
          {pet.photoUrl ? (
            <Image
              src={pet.photoUrl}
              alt={pet.name}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          ) : (
            <PhotoPlaceholder type="pet" className="w-full h-full" />
          )}
          <div className="absolute top-3 right-3">
            <PetPhotoUpload petId={pet.id} />
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <h2
              className="font-display text-pw-ink"
              style={{ fontSize: '26px' }}
            >
              {pet.name}
            </h2>
            <Link href={`/owner/pets/${pet.id}/edit`} className="no-underline">
              <button
                className="min-h-11 inline-flex items-center justify-center rounded-full px-4 py-1.5 bg-white border-[1.5px] border-pw-primary text-pw-primary hover:bg-pw-primary-tint transition-colors flex items-center gap-1.5"
                style={{ fontSize: '13px' }}
              >
                <Pencil size={13} /> Edit
              </button>
            </Link>
          </div>
          <p className="text-pw-muted">
            {pet.species}
            {pet.breed ? ` · ${pet.breed}` : ''}
            {pet.latestWeight ? ` · ${pet.latestWeight} kg` : ''}
          </p>
          <div
            className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1"
            style={{ fontSize: '14px' }}
          >
            {pet.microchipNo && (
              <p className="text-pw-muted">
                Microchip:{' '}
                <span className="text-pw-ink">{pet.microchipNo}</span>
              </p>
            )}
            {pet.chronicCondition && (
              <p className="text-pw-muted">
                Condition:{' '}
                <span className="text-pw-ink">{pet.chronicCondition}</span>
              </p>
            )}
            {pet.drugAllergy && (
              <p className="text-pw-muted">
                Allergy:{' '}
                <span className="text-pw-ink">{pet.drugAllergy}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* V2 (D51, D52): who can see the pet, revoke, and share by code. */}
      <div className="bg-white border border-pw-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
        <h3
          className="font-display text-pw-ink mb-1"
          style={{ fontSize: '20px' }}
        >
          Clinic access
        </h3>
        <p className="text-pw-muted mb-4" style={{ fontSize: '14px' }}>
          Clinics can only see {pet.name}&apos;s records after confirming an
          appointment or when you give them a share code.
        </p>
        <ClinicAccessList petId={pet.id} grants={grants} />
        <div className="border-t border-pw-line mt-4 pt-4">
          <GenerateShareCodeForm petId={pet.id} />
        </div>
      </div>

      <div>
        <h3
          className="font-display text-pw-ink mb-3"
          style={{ fontSize: '20px' }}
        >
          Health passport
        </h3>
        {records.length === 0 ? (
          <div
            className="bg-white border border-pw-line rounded-2xl p-6 text-pw-muted"
            style={{ fontSize: '14px' }}
          >
            No records yet. Clinics you give access to add records after each
            visit.
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-pw-line rounded-2xl p-4 shadow-[0_2px_8px_rgba(45,42,38,0.06)] flex gap-3"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor:
                      r.recordType === 'VACCINE' ? 'var(--color-pw-success-tint)' : 'var(--color-pw-primary-tint)',
                  }}
                >
                  {r.recordType === 'VACCINE' ? (
                    <Syringe size={17} className="text-pw-success" />
                  ) : (
                    <Stethoscope size={17} className="text-pw-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-pw-ink">{r.description}</p>
                    <span
                      className="text-pw-muted shrink-0"
                      style={{ fontSize: '13px' }}
                    >
                      {formatAppTime(r.recordDate, 'd MMM yyyy')}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-1.5 mt-1 text-pw-muted"
                    style={{ fontSize: '13px' }}
                  >
                    <Building2 size={13} />
                    {r.clinic?.name ?? 'Clinic'}
                    {r.nextDueDate && (
                      <span className="text-pw-warning-text">
                        {' '}
                        · next due {formatAppTime(r.nextDueDate, 'd MMM yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
