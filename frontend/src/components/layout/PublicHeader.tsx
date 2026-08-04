import Link from 'next/link';
import { PawPrint } from 'lucide-react';

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F4]/95 backdrop-blur-sm border-b border-[#E6DFD3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <PawPrint className="w-6 h-6 text-[#5E86AD]" />
          <span className="font-display text-xl text-[#2D2A26]">PetWell</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="no-underline">
            <button
              className="px-4 sm:px-5 py-2 rounded-full border-[1.5px] border-[#5E86AD] text-[#5E86AD] bg-transparent hover:bg-[#E4EBF2] transition-colors"
              style={{ minHeight: '44px' }}
            >
              Log In
            </button>
          </Link>
          <Link href="/register" className="no-underline">
            <button
              className="pw-btn-primary px-4 sm:px-5 py-2 rounded-full"
              style={{ minHeight: '44px' }}
            >
              Sign Up
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
