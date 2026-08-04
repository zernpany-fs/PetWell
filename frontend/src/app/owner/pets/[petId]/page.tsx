import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import Image from 'next/image';
import { Syringe, Stethoscope, Building2, Pencil } from 'lucide-react';
import { PetApi } from '@/lib/api/pet.api';
import { HealthRecordApi } from '@/lib/api/health-record.api';
import { HealthRecord } from '@/lib/api/api.type';
import { PhotoPlaceholder } from '@/components/shared/PhotoPlaceholder';
import PetPhotoUpload from '@/components/features/pet/PetPhotoUpload';

export default async function PetProfilePage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = await params;
  const pet = await PetApi.get(petId).catch(() => null);
  if (!pet) notFound();
  const records = await HealthRecordApi.listByPet(petId).catch((): HealthRecord[] => []);

  return (
    <div className="pw-fade max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="bg-white border border-[#E6DFD3] rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
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
            <h2 className="font-display text-[#2D2A26]" style={{ fontSize: '26px' }}>
              {pet.name}
            </h2>
            <Link href={`/owner/pets/${pet.id}/edit`} className="no-underline">
              <button
                className="rounded-full px-4 py-1.5 bg-white border-[1.5px] border-[#5E86AD] text-[#5E86AD] hover:bg-[#E4EBF2] transition-colors flex items-center gap-1.5"
                style={{ fontSize: '13px' }}
              >
                <Pencil size={13} /> Edit
              </button>
            </Link>
          </div>
          <p className="text-[#6E675C]">
            {pet.species}
            {pet.breed ? ` · ${pet.breed}` : ''}
            {pet.latestWeight ? ` · ${pet.latestWeight} kg` : ''}
          </p>
          <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1" style={{ fontSize: '14px' }}>
            {pet.microchipNo && (
              <p className="text-[#6E675C]">Microchip: <span className="text-[#2D2A26]">{pet.microchipNo}</span></p>
            )}
            {pet.chronicCondition && (
              <p className="text-[#6E675C]">Condition: <span className="text-[#2D2A26]">{pet.chronicCondition}</span></p>
            )}
            {pet.drugAllergy && (
              <p className="text-[#6E675C]">Allergy: <span className="text-[#2D2A26]">{pet.drugAllergy}</span></p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-display text-[#2D2A26] mb-3" style={{ fontSize: '20px' }}>
          Health passport
        </h3>
        {records.length === 0 ? (
          <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 text-[#6E675C]" style={{ fontSize: '14px' }}>
            No records yet. A clinic will add records after each visit — they&apos;ll all appear here,
            from any clinic.
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-[0_2px_8px_rgba(45,42,38,0.06)] flex gap-3"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: r.recordType === 'VACCINE' ? '#E7F2EA' : '#E4EBF2' }}
                >
                  {r.recordType === 'VACCINE' ? (
                    <Syringe size={17} className="text-[#58996F]" />
                  ) : (
                    <Stethoscope size={17} className="text-[#5E86AD]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[#2D2A26]">{r.description}</p>
                    <span className="text-[#6E675C] shrink-0" style={{ fontSize: '13px' }}>
                      {format(new Date(r.recordDate), 'd MMM yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[#6E675C]" style={{ fontSize: '13px' }}>
                    <Building2 size={13} />
                    {r.clinic?.name ?? 'Clinic'}
                    {r.nextDueDate && (
                      <span className="text-[#96701D]"> · next due {format(new Date(r.nextDueDate), 'd MMM yyyy')}</span>
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
