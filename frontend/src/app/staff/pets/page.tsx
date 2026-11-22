import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { format } from 'date-fns';
import { Search, PawPrint, User, Phone, ScanLine, Lock } from 'lucide-react';
import { PetApi } from '@/lib/api/pet.api';
import { PetSearchResult } from '@/lib/api/api.type';
import RedeemShareCodeForm from '@/components/features/access/RedeemShareCodeForm';

export const metadata: Metadata = { title: 'Patient Lookup' };

export default async function StaffPetLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = q?.trim() ?? '';
  const results = term
    ? await PetApi.search(term).catch((): PetSearchResult[] => [])
    : [];

  return (
    <div className="pw-fade max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h2 className="font-display text-[#2D2A26]" style={{ fontSize: '26px' }}>
        Patient Lookup
      </h2>
      <p className="text-[#6E675C] mt-1 mb-5">
        Find pets your clinic has access to, through a confirmed appointment or
        the owner&rsquo;s share code.
      </p>

      <RedeemShareCodeForm />

      <form method="get" className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A39B8D]"
          />
          <input
            name="q"
            defaultValue={term}
            placeholder="Pet name, microchip, owner name, email or phone…"
            className="w-full h-12 pl-10 pr-4 bg-white border border-[#E6DFD3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E86AD] text-[#2D2A26] placeholder:text-[#A39B8D]"
          />
        </div>
        <button
          className="pw-btn-primary rounded-full px-6"
          style={{ minHeight: '48px' }}
        >
          Search
        </button>
      </form>

      {!term ? (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F1ECE3] flex items-center justify-center mx-auto mb-3">
            <Search size={20} className="text-[#A39B8D]" />
          </div>
          <p className="text-[#2D2A26] mb-1">Start typing to find a patient</p>
          <p className="text-[#6E675C]" style={{ fontSize: '14px' }}>
            While your clinic has access, you see the pet&rsquo;s full history
            across every clinic.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-10 text-center">
          <p className="text-[#2D2A26] mb-1">
            No pets match &ldquo;{term}&rdquo;
          </p>
          <p className="text-[#6E675C]" style={{ fontSize: '14px' }}>
            You only see pets your clinic has access to. For a walk-in, ask the
            owner for a share code. Pets you only wrote records for can be found
            by pet name.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[#6E675C] mb-3" style={{ fontSize: '14px' }}>
            {results.length} {results.length === 1 ? 'patient' : 'patients'}{' '}
            found
          </p>
          <div className="space-y-3">
            {results.map((pet) => (
              <Link
                key={pet.id}
                href={`/staff/pets/${pet.id}`}
                className="no-underline block"
              >
                <div className="pw-lift bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-[0_2px_8px_rgba(45,42,38,0.06)] flex items-center gap-4">
                  {pet.photoUrl ? (
                    <Image
                      src={pet.photoUrl}
                      alt={pet.name}
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-[#F1ECE3] flex items-center justify-center shrink-0">
                      <PawPrint size={20} className="text-[#A39B8D]" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p
                      className="font-display text-[#2D2A26] truncate"
                      style={{ fontSize: '17px' }}
                    >
                      {pet.name}
                    </p>
                    <p
                      className="text-[#6E675C] truncate"
                      style={{ fontSize: '13px' }}
                    >
                      {pet.species}
                      {pet.breed ? ` · ${pet.breed}` : ''}
                      {pet.birthDate
                        ? ` · born ${format(new Date(pet.birthDate), 'MMM yyyy')}`
                        : ''}
                    </p>
                    <div
                      className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[#6E675C]"
                      style={{ fontSize: '12px' }}
                    >
                      {/* AUTHORED_ONLY results have no owner (D9, D38) */}
                      {pet.owner && (
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {pet.owner.firstName} {pet.owner.lastName}
                        </span>
                      )}
                      {pet.owner?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {pet.owner.phone}
                        </span>
                      )}
                      {pet.microchipNo && (
                        <span className="flex items-center gap-1">
                          <ScanLine size={12} />
                          {pet.microchipNo}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 self-start">
                    {/* D54: only the exception is labelled; FULL is the normal case. */}
                    {pet.accessLevel === 'AUTHORED_ONLY' && (
                      <span
                        className="rounded-full px-2.5 py-0.5 flex items-center gap-1"
                        style={{
                          backgroundColor: '#FBF3E2',
                          color: '#6B5414',
                          fontSize: '12px',
                        }}
                        title="No access now: you only see records your clinic wrote."
                      >
                        <Lock size={11} />
                        Own records only
                      </span>
                    )}
                    {pet.drugAllergy && (
                      <span
                        className="rounded-full px-2.5 py-0.5"
                        style={{
                          backgroundColor: '#F8E6E4',
                          color: '#C4534E',
                          fontSize: '12px',
                        }}
                      >
                        Allergy
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
