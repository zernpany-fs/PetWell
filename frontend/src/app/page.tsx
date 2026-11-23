import Link from 'next/link';
import { ShieldCheck, CalendarDays, Bell } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PhotoPlaceholder } from '@/components/shared/PhotoPlaceholder';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-pw-page">
      <PublicHeader />
      <div className="text-pw-ink">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p
                className="text-pw-coral uppercase tracking-widest mb-4"
                style={{ fontSize: '13px' }}
              >
                PET HEALTH PASSPORT
              </p>
              <h1
                className="font-display text-pw-ink mb-5"
                style={{ fontSize: '52px', lineHeight: 1.1 }}
              >
                Your pet&apos;s health,{' '}
                <span className="italic text-pw-coral">wherever you go.</span>
              </h1>
              <p
                className="text-pw-muted mb-8 max-w-md"
                style={{ lineHeight: 1.6 }}
              >
                Your pet&apos;s vaccines and visits in one record. You choose
                which clinics can see it.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/register" className="no-underline">
                  <button
                    className="pw-btn-primary px-7 py-3 rounded-full"
                    style={{ minHeight: '44px' }}
                  >
                    Get Started
                  </button>
                </Link>
                <a href="#how-it-works" className="no-underline">
                  <button
                    className="px-7 py-3 rounded-full bg-white border-[1.5px] border-pw-primary text-pw-primary hover:bg-pw-primary-tint transition-colors"
                    style={{ minHeight: '44px' }}
                  >
                    How it works
                  </button>
                </a>
              </div>
            </div>
            <div className="order-first lg:order-last relative">
              <div className="hero-wash rounded-[24px] p-3">
                <PhotoPlaceholder
                  type="pet"
                  className="w-full aspect-[4/3] rounded-[20px]"
                />
              </div>
              <span
                className="pw-stick"
                style={{ top: '-14px', left: '8%' }}
                aria-hidden
              >
                🐕
              </span>
              <span
                className="pw-stick"
                style={{ top: '30%', right: '-10px', animationDelay: '1s' }}
                aria-hidden
              >
                🐈
              </span>
              <span
                className="pw-stick"
                style={{ bottom: '-14px', left: '30%', animationDelay: '2s' }}
                aria-hidden
              >
                🦴
              </span>
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl text-center text-pw-ink mb-10">
              Everything in one place
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  icon: ShieldCheck,
                  iconBg: 'var(--color-pw-primary-tint)',
                  iconColor: 'var(--color-pw-primary)',
                  title: 'Health Passport',
                  desc: 'Vaccines, visits and treatments from every clinic, in one record.',
                },
                {
                  icon: CalendarDays,
                  iconBg: 'var(--color-pw-coral-tint)',
                  iconColor: 'var(--color-pw-coral)',
                  title: 'Easy Booking',
                  desc: 'Request appointments at any partnered clinic with a few taps — they call to confirm.',
                },
                {
                  icon: Bell,
                  iconBg: 'var(--color-pw-violet-tint)',
                  iconColor: 'var(--color-pw-violet)',
                  title: 'Vaccine Reminders',
                  desc: 'See which vaccines are due soon on your dashboard.',
                },
              ].map(({ icon: Icon, iconBg, iconColor, title, desc }) => (
                <div
                  key={title}
                  className="pw-lift bg-pw-page border border-pw-line rounded-2xl p-6 shadow-[0_2px_8px_rgba(45,42,38,0.06)]"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: iconBg }}
                  >
                    <Icon size={22} style={{ color: iconColor }} />
                  </div>
                  <h3 className="font-display text-lg text-pw-ink mb-2">
                    {title}
                  </h3>
                  <p className="text-pw-muted" style={{ fontSize: '15px' }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <h2 className="font-display text-3xl text-center text-pw-ink mb-12">
            How it works
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { n: 1, text: 'Create your account' },
              { n: 2, text: 'Add your pets' },
              { n: 3, text: 'Book a visit' },
              { n: 4, text: 'Stay on track' },
            ].map(({ n, text }) => (
              <div
                key={n}
                className="flex flex-col items-center text-center gap-4"
              >
                <div
                  className="w-12 h-12 rounded-full bg-pw-ink text-pw-page flex items-center justify-center shrink-0 font-display"
                  style={{ fontSize: '20px' }}
                >
                  {n}
                </div>
                <p className="text-pw-ink">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="bg-pw-ink text-pw-page py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="font-display text-xl block mb-1">PetWell</span>
              <span className="text-pw-faint" style={{ fontSize: '13px' }}>
                © 2026 PetWell
              </span>
            </div>
            <nav
              className="flex items-center gap-6"
              style={{ fontSize: '14px' }}
            >
              {['About', 'Contact', 'Terms'].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-pw-faint hover:text-pw-page transition-colors no-underline"
                >
                  {link}
                </a>
              ))}
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
