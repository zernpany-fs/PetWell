"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clinic, Pet } from "@/lib/api/api.type";
import { bookAppointmentAction } from "@/lib/actions/appointment.action";
import { DatePicker } from "@/components/ui/date-picker";
import SlotPicker from "./SlotPicker";

export default function BookAppointmentForm({
  pets,
  clinics,
  defaultClinicId,
}: {
  pets: Pet[];
  clinics: Clinic[];
  defaultClinicId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [petId, setPetId] = useState("");
  const [clinicId, setClinicId] = useState(defaultClinicId ?? "");
  const [date, setDate] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [availabilityKey, setAvailabilityKey] = useState(0);

  const field =
    "w-full h-12 px-4 bg-white border border-[#E6DFD3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E86AD] text-[#2D2A26]";

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  function pickDate(next: string) {
    setDate(next);
    setSlotStart("");
    setError(null);
  }

  function pickClinic(next: string) {
    setClinicId(next);
    setSlotStart("");
    setError(null);
  }

  function submit() {
    setError(null);
    if (!petId || !clinicId || !date || !slotStart) {
      setError("Please choose a pet, a clinic, a date, and a time.");
      return;
    }
    startTransition(async () => {
      const r = await bookAppointmentAction({
        petId,
        clinicId,
        appointmentDate: slotStart,
        notes: notes || undefined,
      });
      if (r.success) {
        toast.success(r.message ?? "Requested.");
        router.push("/owner/appointments");
        return;
      }
      setError(r.message);
      setSlotStart("");
      setAvailabilityKey((key) => key + 1);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          className="block text-[#2D2A26] mb-1.5"
          style={{ fontSize: "13px" }}
        >
          Pet
        </label>
        <select
          className={field}
          value={petId}
          onChange={(e) => setPetId(e.target.value)}
        >
          <option value="">Select a pet</option>
          {pets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.species})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className="block text-[#2D2A26] mb-1.5"
          style={{ fontSize: "13px" }}
        >
          Clinic
        </label>
        <select
          className={field}
          value={clinicId}
          onChange={(e) => pickClinic(e.target.value)}
        >
          <option value="">Select a clinic</option>
          {clinics.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className="block text-[#2D2A26] mb-1.5"
          style={{ fontSize: "13px" }}
        >
          Preferred date
        </label>
        <DatePicker
          value={date}
          onChange={pickDate}
          placeholder="Choose a date"
          disabledDays={{ before: startOfToday }}
          startMonth={startOfToday}
        />
      </div>

      <div>
        <label
          className="block text-[#2D2A26] mb-1.5"
          style={{ fontSize: "13px" }}
        >
          Time
        </label>
        <SlotPicker
          clinicId={clinicId}
          date={date}
          value={slotStart}
          onChange={setSlotStart}
          refreshKey={availabilityKey}
        />
      </div>

      <div>
        <label
          className="block text-[#2D2A26] mb-1.5"
          style={{ fontSize: "13px" }}
        >
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-white border border-[#E6DFD3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E86AD] text-[#2D2A26]"
          placeholder="Reason for visit…"
        />
      </div>

      {error && (
        <p className="text-[#C4534E]" style={{ fontSize: "13px" }}>
          {error}
        </p>
      )}

      <p className="text-[#6E675C]" style={{ fontSize: "12px" }}>
        Each hour holds a limited number of visits. The clinic will call to
        confirm your requested time.
      </p>

      <div className="flex gap-3 pt-1">
        <button
          disabled={pending}
          onClick={submit}
          className="pw-btn-primary rounded-full px-6"
          style={{ minHeight: "44px" }}
        >
          {pending ? "Requesting…" : "Request appointment"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/owner/appointments")}
          className="rounded-full px-6 bg-white border-[1.5px] border-[#5E86AD] text-[#5E86AD] hover:bg-[#E4EBF2] transition-colors"
          style={{ minHeight: "44px" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
