export class SlotAvailabilityDto {
  slotStart: Date;

  hour: number;

  booked: number;

  remaining: number;

  isFull: boolean;

  isPast: boolean;
}

export class DayAvailabilityResponseDto {
  clinicId: string;

  date: string;

  capacityPerSlot: number;

  slots: SlotAvailabilityDto[];
}
