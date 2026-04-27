'use client';

import { useState, useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DAY_HEADERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface DatePickerProps {
  value: string; // YYYY-MM-DD or ''
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDisplay(value: string): string {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

export function DatePicker({ value, onChange, placeholder = 'Selecionar data', className }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const parsed = useMemo(() => {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  }, [value]);

  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function selectDay(day: number) {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
  }

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isSelected = (day: number) =>
    parsed && day === parsed.day && viewMonth === parsed.month && viewYear === parsed.year;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border border-[#EAD8A0] bg-white px-3 text-sm outline-none transition-colors focus:border-[#D4B878] focus:ring-2 focus:ring-[#EAD8A0]/50',
            !value && 'text-[#8A6F40]/50',
            className,
          )}
        >
          <span>{value ? formatDisplay(value) : placeholder}</span>
          <div className="flex items-center gap-1">
            {value && (
              <span
                onClick={clear}
                className="rounded p-0.5 hover:bg-terra-100"
              >
                <X className="h-3 w-3 text-[#8A6F40]" />
              </span>
            )}
            <Calendar className="h-4 w-4 text-[#8A6F40]" />
          </div>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-[100] w-[280px] rounded-xl border border-[#EAD8A0] bg-white p-3 shadow-xl animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={4}
          align="start"
        >
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg p-1.5 text-[#8A6F40] transition-colors hover:bg-terra-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-[#2A1508]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg p-1.5 text-[#8A6F40] transition-colors hover:bg-terra-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 gap-0">
            {DAY_HEADERS.map((d, i) => (
              <div key={i} className="flex h-8 items-center justify-center text-[10px] font-bold uppercase text-[#8A6F40]/60">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button
                    type="button"
                    onClick={() => selectDay(day)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
                      isSelected(day)
                        ? 'bg-terra-600 font-bold text-white'
                        : isToday(day)
                          ? 'bg-terra-100 font-semibold text-terra-700'
                          : 'text-[#2A1508] hover:bg-terra-50',
                    )}
                  >
                    {day}
                  </button>
                ) : (
                  <div className="h-8 w-8" />
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-2 flex justify-between border-t border-[#EAD8A0] pt-2">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="text-xs font-medium text-[#8A6F40] hover:text-terra-600"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => {
                const t = today;
                const m = String(t.getMonth() + 1).padStart(2, '0');
                const d = String(t.getDate()).padStart(2, '0');
                onChange(`${t.getFullYear()}-${m}-${d}`);
                setOpen(false);
              }}
              className="text-xs font-medium text-terra-600 hover:text-terra-700"
            >
              Hoje
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
