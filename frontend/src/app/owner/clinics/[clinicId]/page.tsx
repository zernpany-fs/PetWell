import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Phone, ExternalLink, CalendarPlus } from 'lucide-react';
import { ClinicApi } from '@/lib/api/clinic.api';
import { ClinicType } from '@/lib/api/api.type';
import { PhotoPlaceholder } from '@/components/shared/PhotoPlaceholder';

const TYPE_LABEL: Record<ClinicType, string> = {
  GENERAL: 'General',
  EXOTIC: 'Exotic',
  EMERGENCY_24HR: '24hr Emergency',
};

export default async function ClinicDetailPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  const clinic = await ClinicApi.get(clinicId).catch(() => null);
  if (!clinic) notFound();

  return (
    <div className="pw-fade max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="bg-white border border-[#E6DFD3] rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
        <PhotoPlaceholder type="clinic" className="w-full h-40" />
        <div className="p-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-display text-[#2D2A26]" style={{ fontSize: '26px' }}>
              {clinic.name}
            </h2>
            <span
              className="rounded-full px-2.5 py-0.5"
              style={{ backgroundColor: '#E4EBF2', color: '#40638A', fontSize: '12px' }}
            >
              {TYPE_LABEL[clinic.clinicType]}
            </span>
          </div>
          {clinic.description && <p className="text-[#6E675C] mt-2">{clinic.description}</p>}

          <div className="mt-4 space-y-1.5" style={{ fontSize: '14px' }}>
            {clinic.address && (
              <p className="flex items-center gap-2 text-[#6E675C]">
                <MapPin size={15} /> {clinic.address}
              </p>
            )}
            {clinic.phone && (
              <p className="flex items-center gap-2 text-[#6E675C]">
                <Phone size={15} /> {clinic.phone}
              </p>
            )}
            {clinic.googleMapsLink && (
              <a
                href={clinic.googleMapsLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[#5E86AD] hover:text-[#40638A] no-underline"
              >
                <ExternalLink size={15} /> View on Google Maps
              </a>
            )}
          </div>

          <div className="mt-6">
            <Link href={`/owner/appointments/book?clinicId=${clinic.id}`} className="no-underline">
              <button
                className="pw-btn-primary rounded-full px-6 flex items-center gap-2"
                style={{ minHeight: '44px' }}
              >
                <CalendarPlus size={16} /> Book here
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
