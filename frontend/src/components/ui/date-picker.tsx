'use client';

import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type RdpDropdownOption = { value: number; label: string; disabled: boolean };
type RdpDropdownProps = {
  options?: RdpDropdownOption[];
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'>;

function ScrollDropdown({ options = [], value, onChange, ...rest }: RdpDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const current = options.find((o) => String(o.value) === String(value));

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  React.useEffect(() => {
    if (open && listRef.current) {
      listRef.current
        .querySelector('[data-selected="true"]')
        ?.scrollIntoView({ block: 'center' });
    }
  }, [open]);

  function pick(v: number) {
    onChange?.({
      target: { value: String(v) },
    } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={rest['aria-label']}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm font-medium text-[#2D2A26] hover:bg-[#F1ECE3]"
      >
        {current?.label ?? ''}
        <ChevronDown size={14} className="text-[#6E675C]" />
      </button>
      {open && (
        <div
          ref={listRef}
          className="absolute left-0 top-full z-50 mt-1 max-h-48 w-24 overflow-y-auto rounded-lg border border-[#E6DFD3] bg-white p-1 shadow-[0_8px_24px_rgba(45,42,38,0.14)]"
        >
          {options.map((o) => {
            const isSel = String(o.value) === String(value);
            return (
              <button
                key={o.value}
                type="button"
                data-selected={isSel}
                disabled={o.disabled}
                onClick={() => pick(o.value)}
                className={`block w-full rounded-md px-2 py-1 text-left text-sm disabled:opacity-40 ${
                  isSel
                    ? 'bg-[#5E86AD] text-white'
                    : 'text-[#2D2A26] hover:bg-[#F1ECE3]'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Props = {
  value: string;
  onChange: (v: string) => void;
  mode?: 'date' | 'datetime';
  placeholder?: string;
  disabledDays?: React.ComponentProps<typeof Calendar>['disabled'];
  startMonth?: Date;
};

function toDate(value: string, mode: 'date' | 'datetime'): Date | undefined {
  if (!value) return undefined;
  if (mode === 'datetime') {
    const d = new Date(value);
    return isValid(d) ? d : undefined;
  }
  const d = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
}

function toTime(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  return isValid(d) ? format(d, 'HH:mm') : '';
}

export function DatePicker({
  value,
  onChange,
  mode = 'date',
  placeholder = 'Select date',
  disabledDays,
  startMonth,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = toDate(value, mode);
  const time = mode === 'datetime' ? toTime(value) : '';

  function emit(day: Date | undefined, hhmm: string) {
    if (!day) {
      onChange('');
      return;
    }
    if (mode === 'date') {
      onChange(format(day, 'yyyy-MM-dd'));
      return;
    }
    const [h, m] = (hhmm || '09:00').split(':').map(Number);
    const dt = new Date(day);
    dt.setHours(h || 0, m || 0, 0, 0);
    onChange(dt.toISOString());
  }

  const display = selected
    ? format(selected, mode === 'datetime' ? 'd MMM yyyy, HH:mm' : 'd MMM yyyy')
    : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="w-full h-12 px-4 flex items-center justify-between gap-2 bg-white border border-[#E6DFD3] rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-[#5E86AD] transition-shadow"
          >
            <span className={display ? 'text-[#2D2A26]' : 'text-[#9A9284]'}>
              {display || placeholder}
            </span>
            <CalendarIcon size={16} className="text-[#6E675C] shrink-0" />
          </button>
        }
      />
      <PopoverContent
        align="start"
        className="w-auto p-0 rounded-xl border-[#E6DFD3]"
        style={
          {
            ['--primary']: '#5E86AD',
            ['--primary-foreground']: '#ffffff',
          } as React.CSSProperties
        }
      >
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={startMonth ?? new Date(1900, 0)}
          endMonth={new Date(new Date().getFullYear() + 5, 11)}
          disabled={disabledDays}
          selected={selected}
          defaultMonth={selected}
          components={{ Dropdown: ScrollDropdown }}
          onSelect={(day) => {
            emit(day, time);
            if (mode === 'date') setOpen(false);
          }}
        />
        {mode === 'datetime' && (
          <div className="flex items-center gap-2 border-t border-[#F1ECE3] p-2.5">
            <label className="text-[#6E675C]" style={{ fontSize: '13px' }}>
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => emit(selected ?? new Date(), e.target.value)}
              className="flex-1 h-9 px-2 bg-white border border-[#E6DFD3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E86AD] text-[#2D2A26]"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
