import Link from 'next/link';
import { Metadata } from 'next';
import { Search, MapPin } from 'lucide-react';
import { ClinicApi } from '@/lib/api/clinic.api';
import { Clinic, ClinicType } from '@/lib/api/api.type';
import { PhotoPlaceholder } from '@/components/shared/PhotoPlaceholder';

export const metadata: Metadata = { title: 'Clinics' };

const TYPE_LABEL: Record<ClinicType, string> = {
  GENERAL: 'General',
  EXOTIC: 'Exotic',
  EMERGENCY_24HR: '24hr Emergency',
};

export default async function ClinicSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const type = (['GENERAL', 'EXOTIC', 'EMERGENCY_24HR'].includes(sp.type ?? '')
    ? sp.type
    : undefined) as ClinicType | undefined;
  const clinics = await ClinicApi.list({ search: sp.search, type }).catch(
    (): Clinic[] => [],
  );

  return (
    <div className="pw-fade max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h2 className="font-display text-[#2D2A26] mb-5" style={{ fontSize: '26px' }}>
        Find a clinic
      </h2>

      <form method="get" className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A39B8D]" />
          <input
            name="search"
            defaultValue={sp.search ?? ''}
            placeholder="Search by name…"
            className="w-full h-12 pl-10 pr-4 bg-white border border-[#E6DFD3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E86AD] text-[#2D2A26] placeholder:text-[#A39B8D]"
          />
        </div>
        <select
          name="type"
          defaultValue={type ?? ''}
          className="h-12 px-4 bg-white border border-[#E6DFD3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E86AD] text-[#2D2A26]"
        >
          <option value="">All types</option>
          <option value="GENERAL">General</option>
          <option value="EXOTIC">Exotic</option>
          <option value="EMERGENCY_24HR">24hr Emergency</option>
        </select>
        <button className="pw-btn-primary rounded-full px-6" style={{ minHeight: '48px' }}>
          Search
        </button>
      </form>

      {clinics.length === 0 ? (
        <p className="text-[#6E675C]">No clinics match your search.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {clinics.map((c) => (
            <Link key={c.id} href={`/owner/clinics/${c.id}`} className="no-underline">
              <div className="pw-lift bg-white border border-[#E6DFD3] rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
                <PhotoPlaceholder type="clinic" className="w-full h-28" />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-[#2D2A26]" style={{ fontSize: '17px' }}>
                      {c.name}
                    </p>
                    <span
                      className="rounded-full px-2.5 py-0.5 shrink-0"
                      style={{ backgroundColor: '#E4EBF2', color: '#40638A', fontSize: '12px' }}
                    >
                      {TYPE_LABEL[c.clinicType]}
                    </span>
                  </div>
                  {c.address && (
                    <p className="flex items-center gap-1.5 mt-1 text-[#6E675C]" style={{ fontSize: '13px' }}>
                      <MapPin size={13} /> {c.address}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
