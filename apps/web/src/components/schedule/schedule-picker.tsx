'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown } from 'lucide-react';
import type { ScheduleOption } from '@cardapio/shared';
import { cn } from '@/lib/utils';

const TIME_ZONE = 'America/Recife';

interface SchedulePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: ScheduleOption[];
  selectedLabel?: string | null;
  allowNow?: boolean;
  className?: string;
  variant?: 'default' | 'header';
}

interface DayGroup {
  key: string;
  label: string;
  dateLabel: string;
  options: Array<ScheduleOption & { timeLabel: string }>;
}

export function SchedulePicker({
  value,
  onChange,
  options,
  selectedLabel,
  allowNow = true,
  className,
  variant = 'default',
}: SchedulePickerProps) {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => groupScheduleOptions(options, value, selectedLabel), [options, value, selectedLabel]);
  const selectedGroupKey = value ? getDateKey(new Date(value)) : null;
  const [activeDay, setActiveDay] = useState<string | null>(selectedGroupKey ?? groups[0]?.key ?? null);

  useEffect(() => {
    if (selectedGroupKey) {
      setActiveDay(selectedGroupKey);
      return;
    }
    if (!activeDay && groups[0]) setActiveDay(groups[0].key);
  }, [activeDay, groups, selectedGroupKey]);

  const activeGroup = groups.find((group) => group.key === activeDay) ?? groups[0];
  const triggerLabel = selectedLabel ?? (allowNow ? 'Agora' : 'Escolha um horário');
  const contentWidth = variant === 'header' ? 'w-[min(92vw,24rem)]' : 'w-[min(92vw,32rem)]';

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex min-w-0 items-center justify-between gap-2 rounded-xl border outline-none transition-colors',
            variant === 'header'
              ? 'border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-terra-100 backdrop-blur-sm hover:bg-white/20 focus:ring-2 focus:ring-white/25'
              : 'h-11 w-full border-[#E8DDD0] bg-white px-4 text-base font-medium text-[#3D2B1F] focus:border-[#D4C8BA] focus:ring-2 focus:ring-[#E8DDD0]/50',
            className,
          )}
          aria-label="Horário do pedido"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align={variant === 'header' ? 'start' : 'center'}
          sideOffset={6}
          className={cn(
            'z-[110] overflow-hidden rounded-2xl border border-[#E8DDD0] bg-white shadow-2xl animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            contentWidth,
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#E8DDD0] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#3D2B1F]">Horário do pedido</p>
              <p className="mt-0.5 text-xs font-semibold text-[#8B7355]">Escolha uma data e horário</p>
            </div>
            {allowNow && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                  value === null ? 'border-[#4A2810] bg-[#4A2810] text-white' : 'border-[#E8DDD0] bg-white text-[#4A2810] hover:bg-[#FAF6F1]',
                )}
              >
                Agora
              </button>
            )}
          </div>

          {groups.length > 0 && (
            <>
              <div className="flex gap-1.5 overflow-x-auto border-b border-[#E8DDD0] bg-[#FAF6F1] p-2 scrollbar-hide">
                {groups.map((group) => {
                  const active = group.key === activeGroup?.key;
                  return (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => setActiveDay(group.key)}
                      className={cn(
                        'min-w-[4.35rem] shrink-0 rounded-xl border px-2.5 py-2 text-center transition-colors',
                        active
                          ? 'border-[#4A2810] bg-[#4A2810] text-white'
                          : 'border-[#E8DDD0] bg-white text-[#3D2B1F] hover:border-[#D4C8BA]',
                      )}
                    >
                      <span className="block text-xs font-bold leading-none">{group.label}</span>
                      <span className={cn('mt-1 block text-[0.68rem] font-semibold leading-none', active ? 'text-white/70' : 'text-[#8B7355]')}>
                        {group.dateLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="max-h-[14rem] overflow-y-auto p-3">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {activeGroup?.options.map((option) => {
                    const active = option.value === value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                        className={cn(
                          'rounded-xl border px-2 py-2 text-sm font-bold transition-colors',
                          active
                            ? 'border-[#4A2810] bg-[#4A2810] text-white'
                            : 'border-[#E8DDD0] bg-white text-[#3D2B1F] hover:border-[#D4C8BA] hover:bg-[#FAF6F1]',
                        )}
                      >
                        {option.timeLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {groups.length === 0 && (
            <div className="px-4 py-6 text-center text-sm font-semibold text-[#8B7355]">
              Nenhum horário disponível nos próximos dias.
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function groupScheduleOptions(options: ScheduleOption[], value?: string | null, selectedLabel?: string | null): DayGroup[] {
  const merged = [...options];
  if (value && selectedLabel && !merged.some((option) => option.value === value)) {
    merged.unshift({ value, label: selectedLabel });
  }

  const map = new Map<string, DayGroup>();
  const reference = new Date();

  for (const option of merged) {
    const date = new Date(option.value);
    if (Number.isNaN(date.getTime())) continue;
    const key = getDateKey(date);
    const group = map.get(key) ?? {
      key,
      label: getDayLabel(date, reference),
      dateLabel: formatDateLabel(date),
      options: [],
    };
    group.options.push({ ...option, timeLabel: formatTimeLabel(date) });
    map.set(key, group);
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      options: group.options.sort((a, b) => new Date(a.value).getTime() - new Date(b.value).getTime()),
    }))
    .sort((a, b) => new Date(a.options[0]?.value ?? 0).getTime() - new Date(b.options[0]?.value ?? 0).getTime())
    .slice(0, 7);
}

function getDateKey(date: Date): string {
  const parts = getParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getDayLabel(date: Date, reference: Date): string {
  const key = getDateKey(date);
  if (key === getDateKey(reference)) return 'Hoje';

  const tomorrow = new Date(reference);
  tomorrow.setDate(reference.getDate() + 1);
  if (key === getDateKey(tomorrow)) return 'Amanhã';

  const weekday = new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE, weekday: 'short' })
    .format(date)
    .replace('.', '');
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit' }).format(date);
}

function formatTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function getParts(date: Date): { year: string; month: string; day: string } {
  const values: Record<string, string> = {};
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return { year: values.year, month: values.month, day: values.day };
}
