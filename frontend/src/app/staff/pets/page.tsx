import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { formatAppTime } from '@/lib/datetime';
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
      <h2 className="font-display text-pw-ink" style={{ fontSize: '26px' }}>
        Patient Lookup
      </h2>
      <p className="text-pw-muted mt-1 mb-5">
        Shows pets your clinic can access. For a walk-in, ask the owner for a
        share code.
      </p>

      <RedeemShareCodeForm />

      <form method="get" className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pw-faint"
          />
          <input
            name="q"
            defaultValue={term}
            placeholder="Pet name, microchip, owner name, email or phone…"
            className="w-full h-12 pl-10 pr-4 bg-white border border-pw-line rounded-xl focus:outline-none focus:ring-2 focus:ring-pw-primary text-pw-ink placeholder:text-pw-faint"
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
        <div className="bg-white border border-pw-line rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-pw-sand flex items-center justify-center mx-auto mb-3">
            <Search size={20} className="text-pw-faint" />
          </div>
          <p className="text-pw-ink mb-1">Start typing to find a patient</p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white border border-pw-line rounded-2xl p-10 text-center">
          <p className="text-pw-ink mb-1">
            No pets match &ldquo;{term}&rdquo;
          </p>
          <p className="text-pw-muted" style={{ fontSize: '14px' }}>
            Pets you only wrote records for are found by pet name.
          </p>
        </div>
      ) : (
        <>
          <p className="text-pw-muted mb-3" style={{ fontSize: '14px' }}>
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
                <div className="pw-lift bg-white border border-pw-line rounded-2xl p-4 shadow-[0_2px_8px_rgba(45,42,38,0.06)] flex items-center gap-4">
                  {pet.photoUrl ? (
                    <Image
                      src={pet.photoUrl}
                      alt={pet.name}
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-pw-sand flex items-center justify-center shrink-0">
                      <PawPrint size={20} className="text-pw-faint" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p
                      className="font-display text-pw-ink truncate"
                      style={{ fontSize: '17px' }}
                    >
                      {pet.name}
                    </p>
                    <p
                      className="text-pw-muted truncate"
                      style={{ fontSize: '13px' }}
                    >
                      {pet.species}
                      {pet.breed ? ` · ${pet.breed}` : ''}
                      {pet.birthDate
                        ? ` · born ${formatAppTime(pet.birthDate, 'MMM yyyy')}`
                        : ''}
                    </p>
                    <div
                      className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-pw-muted"
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
                          backgroundColor: 'var(--color-pw-warning-tint-2)',
                          color: 'var(--color-pw-warning-ink)',
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
                          backgroundColor: 'var(--color-pw-danger-soft)',
                          color: 'var(--color-pw-danger)',
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
