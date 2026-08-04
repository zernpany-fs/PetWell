import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { PetApi } from '@/lib/api/pet.api';
import { Pet } from '@/lib/api/api.type';
import { PhotoPlaceholder } from '@/components/shared/PhotoPlaceholder';

export const metadata: Metadata = { title: 'My Pets' };

export default async function MyPetsPage() {
  const pets = await PetApi.listMine().catch((): Pet[] => []);

  return (
    <div className="pw-fade max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-[#2D2A26]" style={{ fontSize: '26px' }}>
          My Pets
        </h2>
        <Link href="/owner/pets/new" className="no-underline">
          <button
            className="pw-btn-primary rounded-full px-5 flex items-center gap-2"
            style={{ minHeight: '44px' }}
          >
            <Plus size={16} /> Add pet
          </button>
        </Link>
      </div>

      {pets.length === 0 ? (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-10 text-center">
          <PhotoPlaceholder type="pet" className="w-16 h-16 rounded-2xl mx-auto mb-4" />
          <p className="text-[#2D2A26] mb-1">No pets yet</p>
          <p className="text-[#6E675C] mb-5" style={{ fontSize: '14px' }}>
            Add your first pet to start its health passport.
          </p>
          <Link href="/owner/pets/new" className="no-underline">
            <button className="pw-btn-primary rounded-full px-5" style={{ minHeight: '44px' }}>
              Add a pet
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((p) => (
            <Link key={p.id} href={`/owner/pets/${p.id}`} className="no-underline">
              <div className="pw-lift bg-white border border-[#E6DFD3] rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
                {p.photoUrl ? (
                  // aspect ratio on the wrapper, since a filled Image cannot
                  // give the container its own height. `sizes` mirrors the grid
                  // above — without it Next would fetch a full-viewport image
                  // for a slot that is only a third as wide.
                  <div className="relative w-full aspect-[4/3]">
                    <Image
                      src={p.photoUrl}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <PhotoPlaceholder type="pet" className="w-full aspect-[4/3]" />
                )}
                <div className="p-4">
                  <p className="font-display text-[#2D2A26]" style={{ fontSize: '18px' }}>
                    {p.name}
                  </p>
                  <p className="text-[#6E675C]" style={{ fontSize: '13px' }}>
                    {p.species}
                    {p.breed ? ` · ${p.breed}` : ''}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
