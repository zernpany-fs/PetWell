import { cn } from '@/lib/utils';

export function PawMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-6 w-6', className)}
      fill="currentColor"
      aria-hidden
    >
      <ellipse cx="32" cy="42" rx="13" ry="10" />
      <ellipse cx="16" cy="30" rx="5.2" ry="7" />
      <ellipse cx="25" cy="21" rx="5" ry="7.2" />
      <ellipse cx="39" cy="21" rx="5" ry="7.2" />
      <ellipse cx="48" cy="30" rx="5.2" ry="7" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-bold', className)}>
      <PawMark className="h-6 w-6 text-teal-600" />
      <span className="text-lg tracking-tight text-teal-700">PetWell</span>
    </span>
  );
}
