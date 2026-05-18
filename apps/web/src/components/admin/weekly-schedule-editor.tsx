'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  WEEKDAYS,
  getShortDayName,
  minutesToTime,
  normalizeWeeklySchedule,
  timeToMinutes,
  type TimeRange,
  type Weekday,
  type WeeklySchedule,
} from '@cardapio/shared';

interface WeeklyScheduleEditorProps {
  value?: WeeklySchedule | null;
  onChange: (schedule: WeeklySchedule | null) => void;
  allowUnrestricted?: boolean;
  unrestrictedLabel?: string;
}

export function WeeklyScheduleEditor({
  value,
  onChange,
  allowUnrestricted = false,
  unrestrictedLabel = 'Sem restrição de horário',
}: WeeklyScheduleEditorProps) {
  const configured = value !== null && value !== undefined;
  const [draft, setDraft] = useState<WeeklySchedule>(() => completeSchedule(value));
  const schedule = draft;

  useEffect(() => {
    setDraft(completeSchedule(value));
  }, [value]);

  if (allowUnrestricted && !configured) {
    return (
      <div className="rounded-xl border border-dashed border-[#E8DDD0] bg-white/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#8B7355]">{unrestrictedLabel}</p>
          <button
            type="button"
            onClick={() => {
              const next = emptySchedule();
              setDraft(next);
              onChange(next);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E8DDD0] px-3 py-2 text-xs font-bold text-[#A0603A] transition-colors hover:bg-[#FAF6F1]"
          >
            <Plus className="h-3.5 w-3.5" />
            Configurar horários
          </button>
        </div>
      </div>
    );
  }

  function commit(next: WeeklySchedule | null) {
    if (allowUnrestricted && next === null) {
      setDraft(emptySchedule());
      onChange(null);
      return;
    }

    const normalized = normalizeWeeklySchedule(next) ?? emptySchedule();
    setDraft(normalized);
    if (hasInvalidRanges(normalized)) return;

    onChange(normalized);
  }

  function addRange(day: Weekday) {
    const ranges = schedule[day] ?? [];
    const nextRange = getNextAvailableRange(ranges);
    if (!nextRange) return;

    commit({ ...schedule, [day]: [...ranges, nextRange] });
  }

  function updateRange(day: Weekday, index: number, patch: Partial<TimeRange>) {
    const ranges = [...(schedule[day] ?? [])];
    ranges[index] = { ...ranges[index], ...patch };
    commit({ ...schedule, [day]: ranges });
  }

  function removeRange(day: Weekday, index: number) {
    const ranges = (schedule[day] ?? []).filter((_, i) => i !== index);
    commit({ ...schedule, [day]: ranges });
  }

  return (
    <div className="space-y-2 rounded-xl border border-[#E8DDD0] bg-white/50 p-3">
      {allowUnrestricted && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => commit(null)}
            className="text-xs font-bold text-[#8B7355] transition-colors hover:text-[#A0603A]"
          >
            Remover restrição
          </button>
        </div>
      )}
      {WEEKDAYS.map((day) => {
        const ranges = schedule[day] ?? [];
        return (
          <div key={day} className="rounded-lg border border-[#E8DDD0] bg-[#FFFCF8] p-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-10 shrink-0 items-center justify-center rounded-lg bg-[#A0603A] text-xs font-bold text-white">
                {getShortDayName(day)}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {ranges.length === 0 ? (
                  <span className="text-xs font-semibold text-[#C4B5A0]">Fechado</span>
                ) : (
                  ranges.map((range, index) => {
                    const invalid = isInvalidRange(range);
                    return (
                      <div key={`${day}-${index}`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={range.start}
                            onChange={(event) => updateRange(day, index, { start: event.target.value })}
                            aria-invalid={invalid}
                            className={`h-9 w-28 rounded-lg border bg-white px-2 text-sm font-semibold text-[#3D2B1F] outline-none focus:ring-2 ${
                              invalid ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-[#E8DDD0] focus:border-[#D4C8BA] focus:ring-[#E8DDD0]/50'
                            }`}
                          />
                          <span className="text-xs font-semibold text-[#8B7355]">às</span>
                          <input
                            type="time"
                            value={range.end}
                            onChange={(event) => updateRange(day, index, { end: event.target.value })}
                            aria-invalid={invalid}
                            className={`h-9 w-28 rounded-lg border bg-white px-2 text-sm font-semibold text-[#3D2B1F] outline-none focus:ring-2 ${
                              invalid ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-[#E8DDD0] focus:border-[#D4C8BA] focus:ring-[#E8DDD0]/50'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => removeRange(day, index)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#C4B5A0] transition-colors hover:bg-red-50 hover:text-red-500"
                            aria-label="Remover intervalo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {invalid && (
                          <p className="mt-1 text-[11px] font-semibold text-red-600">
                            O horário final deve ser depois do inicial.
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <button
                type="button"
                onClick={() => addRange(day)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E8DDD0] text-[#A0603A] transition-colors hover:bg-[#FAF6F1]"
                aria-label="Adicionar intervalo"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function completeSchedule(value?: WeeklySchedule | null): WeeklySchedule {
  const normalized = normalizeWeeklySchedule(value) ?? {};
  const schedule: WeeklySchedule = {};
  for (const day of WEEKDAYS) {
    schedule[day] = normalized[day] ?? [];
  }
  return schedule;
}

function emptySchedule(): WeeklySchedule {
  const schedule: WeeklySchedule = {};
  for (const day of WEEKDAYS) {
    schedule[day] = [];
  }
  return schedule;
}

function getNextAvailableRange(ranges: TimeRange[]): TimeRange | null {
  const sorted = [...ranges].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  if (sorted.length === 0) return { start: '11:00', end: '15:00' };
  if (!hasExactRange({ start: '18:00', end: '21:00' }, sorted)) return { start: '18:00', end: '21:00' };

  const last = sorted[sorted.length - 1];
  const start = last ? timeToMinutes(last.end) : timeToMinutes('11:00');
  const end = Math.min(start + 60, (24 * 60) - 1);

  if (start >= end) return null;
  return { start: minutesToTime(start), end: minutesToTime(end) };
}

function hasExactRange(candidate: TimeRange, ranges: TimeRange[]): boolean {
  return ranges.some((range) => range.start === candidate.start && range.end === candidate.end);
}

function hasInvalidRanges(schedule: WeeklySchedule): boolean {
  return WEEKDAYS.some((day) => (schedule[day] ?? []).some(isInvalidRange));
}

function isInvalidRange(range: TimeRange): boolean {
  return timeToMinutes(range.start) >= timeToMinutes(range.end);
}
