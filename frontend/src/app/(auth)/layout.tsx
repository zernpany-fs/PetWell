import { PublicHeader } from '@/components/layout/PublicHeader';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAF8F4]">
      <PublicHeader />
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
