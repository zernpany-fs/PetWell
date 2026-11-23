import { Metadata } from 'next';
import AddPetForm from '@/components/features/pet/AddPetForm';

export const metadata: Metadata = { title: 'Add Pet' };

export default function NewPetPage() {
  return (
    <div className="pw-fade max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h2 className="font-display text-pw-ink mb-6" style={{ fontSize: '26px' }}>
        Add a pet
      </h2>
      <div className="bg-white border border-pw-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
        <AddPetForm />
      </div>
    </div>
  );
}
