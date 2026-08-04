import { Metadata } from 'next';
import { PetApi } from '@/lib/api/pet.api';
import { ClinicApi } from '@/lib/api/clinic.api';
import { Clinic, Pet } from '@/lib/api/api.type';
import BookAppointmentForm from '@/components/features/appointment/BookAppointmentForm';

export const metadata: Metadata = { title: 'Book Appointment' };

export default async function BookAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ clinicId?: string }>;
}) {
  const sp = await searchParams;
  const [pets, clinics] = await Promise.all([
    PetApi.listMine().catch((): Pet[] => []),
    ClinicApi.list().catch((): Clinic[] => []),
  ]);

  return (
    <div className="pw-fade max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h2 className="font-display text-[#2D2A26] mb-6" style={{ fontSize: '26px' }}>
        Book an appointment
      </h2>
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-[0_2px_8px_rgba(45,42,38,0.06)]">
        {pets.length === 0 ? (
          <p className="text-[#6E675C]" style={{ fontSize: '14px' }}>
            You need a pet first. Add one from the My Pets page.
          </p>
        ) : (
          <BookAppointmentForm pets={pets} clinics={clinics} defaultClinicId={sp.clinicId} />
        )}
      </div>
    </div>
  );
}
