import { notFound } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { Syringe, Stethoscope, Building2 } from 'lucide-react';
import { PetApi } from '@/lib/api/pet.api';
import { HealthRecordApi } from '@/lib/api/health-record.api';
import { HealthRecord } from '@/lib/api/api.type';
import { PhotoPlaceholder } from '@/components/shared/PhotoPlaceholder';
import AddHealthRecordForm from '@/components/features/health-record/AddHealthRecordForm';

export default async function StaffPetPage({
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
        {pet.photoUrl ? (
          // The wrapper carries the height; a filled Image is absolutely
          // positioned and would otherwise leave the container at zero.
          <div className="relative h-40">
            <Image
              src={pet.photoUrl}
              alt={pet.name}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <PhotoPlaceholder type="pet" className="w-full h-40" />
        )}
        <div className="p-6">
          <h2 className="font-display text-[#2D2A26]" style={{ fontSize: '24px' }}>{pet.name}</h2>
          <p className="text-[#6E675C]">
            {pet.species}
            {pet.breed ? ` · ${pet.breed}` : ''}
          </p>
          {(pet.chronicCondition || pet.drugAllergy) && (
            <div className="mt-2" style={{ fontSize: '14px' }}>
              {pet.chronicCondition && <p className="text-[#6E675C]">Condition: <span className="text-[#2D2A26]">{pet.chronicCondition}</span></p>}
              {pet.drugAllergy && <p className="text-[#6E675C]">Allergy: <span className="text-[#2D2A26]">{pet.drugAllergy}</span></p>}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
        <h3 className="font-display text-[#2D2A26] mb-4" style={{ fontSize: '18px' }}>Add a health record</h3>
        <AddHealthRecordForm petId={petId} />
      </div>

      <div>
        <h3 className="font-display text-[#2D2A26] mb-3" style={{ fontSize: '18px' }}>History</h3>
        {records.length === 0 ? (
          <p className="text-[#6E675C]" style={{ fontSize: '14px' }}>No records yet.</p>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div key={r.id} className="bg-white border border-[#E6DFD3] rounded-2xl p-4 flex gap-3">
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
                  <p className="flex items-center gap-1.5 mt-1 text-[#6E675C]" style={{ fontSize: '13px' }}>
                    <Building2 size={13} /> {r.clinic?.name ?? 'Clinic'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
