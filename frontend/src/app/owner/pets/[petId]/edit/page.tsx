import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { PetApi } from '@/lib/api/pet.api';
import EditPetForm from '@/components/features/pet/EditPetForm';

export const metadata: Metadata = { title: 'Edit Pet' };

export default async function EditPetPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = await params;
  const pet = await PetApi.get(petId).catch(() => null);
  if (!pet) notFound();

  return (
    <div className="pw-fade max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h2 className="font-display text-[#2D2A26] mb-6" style={{ fontSize: '26px' }}>
        Edit {pet.name}
      </h2>
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
        <EditPetForm pet={pet} />
      </div>
    </div>
  );
}
