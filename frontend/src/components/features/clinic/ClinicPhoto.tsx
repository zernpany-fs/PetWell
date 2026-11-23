import Image from 'next/image';
import { PhotoPlaceholder } from '@/components/shared/PhotoPlaceholder';

/**
 * US-08: the clinic photo, or the old placeholder when there is none (AC5).
 * `className` sizes the box (e.g. "w-full h-28"); the image fills it.
 */
export default function ClinicPhoto({
  photoUrl,
  name,
  className = '',
  sizes = '(max-width: 640px) 100vw, 50vw',
  priority = false,
}: {
  photoUrl: string | null;
  name: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!photoUrl) {
    return (
      <div data-testid="clinic-photo-placeholder">
        <PhotoPlaceholder type="clinic" className={className} />
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-pw-sand ${className}`}>
      <Image
        src={photoUrl}
        alt={name}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
