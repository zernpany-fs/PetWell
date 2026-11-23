import { PawPrint, Building2 } from 'lucide-react';

export function PhotoPlaceholder({
  type = 'pet',
  className = '',
  style,
}: {
  type?: 'pet' | 'clinic';
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = type === 'clinic' ? Building2 : PawPrint;
  return (
    <div
      className={`bg-pw-sand flex items-center justify-center ${className}`}
      style={style}
    >
      <Icon className="text-pw-faint" size={32} />
    </div>
  );
}
