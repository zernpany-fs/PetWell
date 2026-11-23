import { notFound } from 'next/navigation';
import Image from 'next/image';
import { formatAppTime } from '@/lib/datetime';
import {
  Syringe,
  Stethoscope,
  Building2,
  Lock,
  Phone,
  Mail,
  User,
} from 'lucide-react';
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
  // 404 = no access and no authored records, or no such pet (D20).
  const pet = await PetApi.getForClinic(petId).catch(() => null);
  if (!pet) notFound();
  const records = await HealthRecordApi.listByPet(petId).catch(
    (): HealthRecord[] => [],
  );

  // D20/D53: no active access, but this clinic wrote records before.
  // Show only id/name/species + its own records; no owner, no new records.
  if (pet.accessLevel === 'AUTHORED_ONLY') {
    return (
      <div className="pw-fade max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
          <h2
            className="font-display text-[#2D2A26]"
            style={{ fontSize: '24px' }}
          >
            {pet.name}
          </h2>
          <p className="text-[#6E675C]">{pet.species}</p>
          <div
            className="mt-4 flex gap-2 bg-[#FBF3E2] border border-[#EAD9B0] rounded-xl p-3 text-[#6B5414]"
            style={{ fontSize: '13px' }}
          >
            <Lock size={15} className="shrink-0 mt-0.5" />
            <p>
              Limited access. Your clinic no longer has access to this pet, so
              you only see records your clinic wrote and cannot add new ones. To
              see the full history again, ask the owner for a share code or
              confirm a new appointment.
            </p>
          </div>
        </div>
        <RecordList title="Records your clinic wrote" records={records} />
      </div>
    );
  }

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
          <h2
            className="font-display text-[#2D2A26]"
            style={{ fontSize: '24px' }}
          >
            {pet.name}
          </h2>
          <p className="text-[#6E675C]">
            {pet.species}
            {pet.breed ? ` · ${pet.breed}` : ''}
          </p>
          {(pet.chronicCondition || pet.drugAllergy) && (
            <div className="mt-2" style={{ fontSize: '14px' }}>
              {pet.chronicCondition && (
                <p className="text-[#6E675C]">
                  Condition:{' '}
                  <span className="text-[#2D2A26]">{pet.chronicCondition}</span>
                </p>
              )}
              {pet.drugAllergy && (
                <p className="text-[#6E675C]">
                  Allergy:{' '}
                  <span className="text-[#2D2A26]">{pet.drugAllergy}</span>
                </p>
              )}
            </div>
          )}
          {/* D9: owner contact only while the clinic has access. */}
          <div
            className="mt-4 pt-4 border-t border-[#E6DFD3] grid sm:grid-cols-3 gap-2 text-[#2D2A26]"
            style={{ fontSize: '13px' }}
          >
            <p className="flex items-center gap-1.5">
              <User size={13} className="text-[#6E675C]" />
              {pet.owner.firstName} {pet.owner.lastName}
            </p>
            {pet.owner.phone && (
              <p className="flex items-center gap-1.5">
                <Phone size={13} className="text-[#6E675C]" />
                {pet.owner.phone}
              </p>
            )}
            <p className="flex items-center gap-1.5 min-w-0">
              <Mail size={13} className="text-[#6E675C] shrink-0" />
              <span className="truncate">{pet.owner.email}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
        <h3
          className="font-display text-[#2D2A26] mb-4"
          style={{ fontSize: '18px' }}
        >
          Add a health record
        </h3>
        <AddHealthRecordForm petId={petId} />
      </div>

      <RecordList title="History" records={records} />
    </div>
  );
}

/** Used by both views; the backend already limits AUTHORED_ONLY to own records. */
function RecordList({
  title,
  records,
}: {
  title: string;
  records: HealthRecord[];
}) {
  return (
    <div>
      <h3
        className="font-display text-[#2D2A26] mb-3"
        style={{ fontSize: '18px' }}
      >
        {title}
      </h3>
      {records.length === 0 ? (
        <p className="text-[#6E675C]" style={{ fontSize: '14px' }}>
          No records yet.
        </p>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-[#E6DFD3] rounded-2xl p-4 flex gap-3"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor:
                    r.recordType === 'VACCINE' ? '#E7F2EA' : '#E4EBF2',
                }}
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
                  <span
                    className="text-[#6E675C] shrink-0"
                    style={{ fontSize: '13px' }}
                  >
                    {formatAppTime(r.recordDate, 'd MMM yyyy')}
                  </span>
                </div>
                <p
                  className="flex items-center gap-1.5 mt-1 text-[#6E675C]"
                  style={{ fontSize: '13px' }}
                >
                  <Building2 size={13} /> {r.clinic?.name ?? 'Clinic'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
