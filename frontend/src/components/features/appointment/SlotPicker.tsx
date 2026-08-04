"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { SlotAvailability } from "@/lib/api/api.type";
import { getSlotAvailabilityAction } from "@/lib/actions/appointment.action";

type Loaded = { key: string; slots: SlotAvailability[] | null };

export default function SlotPicker({
  clinicId,
  date,
  value,
  onChange,
  refreshKey = 0,
}: {
  clinicId: string;
  date: string;
  value: string;
  onChange: (slotStart: string) => void;
  refreshKey?: number;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, startLoading] = useTransition();

  const requestKey = `${clinicId}|${date}|${refreshKey}`;

  useEffect(() => {
    if (!clinicId || !date) return;
    let cancelled = false;
    startLoading(async () => {
      const result = await getSlotAvailabilityAction(clinicId, date);
      console.log("khkh", result);
      if (!cancelled)
        setLoaded({ key: requestKey, slots: result?.slots ?? null });
    });
    return () => {
      cancelled = true;
    };
  }, [clinicId, date, requestKey]);

  const fresh = loaded?.key === requestKey ? loaded : null;

  if (!clinicId || !date) {
    return (
      <p className="text-[#6E675C]" style={{ fontSize: "13px" }}>
        Choose a clinic and a date to see available times.
      </p>
    );
  }

  if (!fresh) {
    return (
      <p
        className="flex items-center gap-2 text-[#6E675C]"
        style={{ fontSize: "13px" }}
      >
        <Loader2 size={14} className="animate-spin" /> Loading available times…
      </p>
    );
  }

  if (fresh.slots === null) {
    return (
      <p className="text-[#C4534E]" style={{ fontSize: "13px" }}>
        Couldn&rsquo;t load available times. Please pick the date again.
      </p>
    );
  }

  const slots = fresh.slots;
  if (slots.length === 0) {
    return (
      <p className="text-[#6E675C]" style={{ fontSize: "13px" }}>
        This clinic has no bookable hours on that day.
      </p>
    );
  }

  const openSlots = slots.filter((slot) => !slot.isFull && !slot.isPast);

  return (
    <div className={loading ? "opacity-60 transition-opacity" : undefined}>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map((slot) => {
          console.log("object", slot);
          const disabled = slot.isFull || slot.isPast;
          console.log("dissss", disabled);
          const selected = !disabled && slot.slotStart === value;
          const label = `${String(slot.hour).padStart(2, "0")}:00`;
          const capacity = slot.remaining + slot.booked;

          return (
            <button
              key={slot.slotStart}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(slot.slotStart)}
              title={
                slot.isPast
                  ? "This hour has already passed"
                  : slot.isFull
                    ? "Fully booked"
                    : `${slot.remaining} of ${capacity} left`
              }
              className={`rounded-xl border px-2 py-2 transition-colors ${
                selected
                  ? "border-[#5E86AD] bg-[#E4EBF2] text-[#40638A]"
                  : disabled
                    ? "border-[#EFECE4] bg-[#F7F5F0] text-[#B5AEA1] cursor-not-allowed"
                    : "border-[#E6DFD3] bg-white text-[#2D2A26] hover:border-[#5E86AD] hover:bg-[#F4F7FA]"
              }`}
              style={{ minHeight: "52px" }}
            >
              <span className="block" style={{ fontSize: "14px" }}>
                {label}
              </span>
              <span className="block" style={{ fontSize: "11px" }}>
                {slot.isPast
                  ? "passed"
                  : slot.isFull
                    ? "Full"
                    : `${slot.remaining} left`}
              </span>
            </button>
          );
        })}
      </div>

      {openSlots.length === 0 && (
        <p className="mt-3 text-[#C08A2D]" style={{ fontSize: "13px" }}>
          Every hour on this day is fully booked. Please choose another date.
        </p>
      )}
    </div>
  );
}
