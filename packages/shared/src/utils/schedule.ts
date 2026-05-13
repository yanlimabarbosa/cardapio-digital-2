import type { ScheduleAvailability, ScheduleOption, TimeRange, Weekday, WeeklySchedule } from '../types/schedule';

export const RECIFE_TIME_ZONE = 'America/Recife';
export const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const SHORT_DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ALL_DAY_RANGE = { start: 0, end: 24 * 60 };

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: Weekday;
}

interface MinuteRange {
  start: number;
  end: number;
}

export interface ScheduleRule {
  schedule?: WeeklySchedule | null;
  defaultAvailable: boolean;
}

export function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function minutesToTime(value: number): string {
  const minutes = Math.max(0, Math.min(24 * 60, value));
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function normalizeWeeklySchedule(schedule?: WeeklySchedule | null): WeeklySchedule | null {
  if (!schedule) return null;

  const normalized: WeeklySchedule = {};

  for (const day of WEEKDAYS) {
    const rawRanges = getRawRanges(schedule, day);
    const ranges = rawRanges
      .filter((range): range is TimeRange => !!range && isValidTime(range.start) && isValidTime(range.end))
      .filter((range) => timeToMinutes(range.start) < timeToMinutes(range.end))
      .map((range) => ({ start: range.start, end: range.end }))
      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

    if (ranges.length > 0 || Object.prototype.hasOwnProperty.call(schedule, day) || Object.prototype.hasOwnProperty.call(schedule, String(day))) {
      normalized[day] = ranges;
    }
  }

  return normalized;
}

export function legacyToWeeklySchedule(openDays?: number[] | null, openingTime?: string | null, closingTime?: string | null): WeeklySchedule {
  const schedule: WeeklySchedule = {};
  if (!openDays?.length || !openingTime || !closingTime || !isValidTime(openingTime) || !isValidTime(closingTime)) {
    return schedule;
  }

  for (const day of openDays) {
    if (!WEEKDAYS.includes(day as Weekday)) continue;
    if (timeToMinutes(openingTime) >= timeToMinutes(closingTime)) continue;
    schedule[day as Weekday] = [{ start: openingTime, end: closingTime }];
  }

  return schedule;
}

export function getRangesForDay(schedule: WeeklySchedule | null | undefined, day: number): TimeRange[] {
  return getRawRanges(schedule, day).filter(
    (range): range is TimeRange => !!range && isValidTime(range.start) && isValidTime(range.end) && timeToMinutes(range.start) < timeToMinutes(range.end),
  );
}

export function hasConfiguredSchedule(schedule?: WeeklySchedule | null): boolean {
  if (!schedule) return false;
  return WEEKDAYS.some((day) => Object.prototype.hasOwnProperty.call(schedule, day) || Object.prototype.hasOwnProperty.call(schedule, String(day)));
}

export function getCombinedScheduleAvailability(
  rules: ScheduleRule[],
  date = new Date(),
  options?: { timeZone?: string; maxDays?: number },
): ScheduleAvailability {
  const timeZone = options?.timeZone ?? RECIFE_TIME_ZONE;
  const parts = getZonedParts(date, timeZone);
  const ranges = getOverlappingRanges(rules, parts.weekday);
  const currentMinutes = parts.hour * 60 + parts.minute;

  const available = ranges.some((range) => currentMinutes >= range.start && currentMinutes < range.end);
  if (available) {
    return { available: true };
  }

  const next = findNextAvailability(rules, date, {
    timeZone,
    maxDays: options?.maxDays ?? 14,
  });

  return {
    available: false,
    nextAvailableAt: next?.toISOString(),
    nextAvailableLabel: next ? formatNextAvailableLabel(next, date, timeZone) : undefined,
  };
}

export function buildScheduleOptions(
  schedule: WeeklySchedule | null | undefined,
  from = new Date(),
  options?: { timeZone?: string; intervalMinutes?: number; maxDays?: number; limit?: number },
): ScheduleOption[] {
  const normalized = normalizeWeeklySchedule(schedule);
  if (!normalized) return [];

  const timeZone = options?.timeZone ?? RECIFE_TIME_ZONE;
  const intervalMinutes = options?.intervalMinutes ?? 30;
  const maxDays = options?.maxDays ?? 7;
  const limit = options?.limit ?? 80;
  const fromParts = getZonedParts(from, timeZone);
  const currentMinutes = fromParts.hour * 60 + fromParts.minute;
  const items: ScheduleOption[] = [];

  for (let offset = 0; offset <= maxDays; offset++) {
    const dayParts = getLocalDateOffset(from, offset, timeZone);
    const ranges = getRangesForDay(normalized, dayParts.weekday)
      .map((range) => ({ start: timeToMinutes(range.start), end: timeToMinutes(range.end) }));

    for (const range of ranges) {
      const minStart = offset === 0 ? Math.max(range.start, roundUp(currentMinutes + 1, intervalMinutes)) : range.start;
      for (let minutes = roundUp(minStart, intervalMinutes); minutes < range.end; minutes += intervalMinutes) {
        const date = zonedTimeToDate(dayParts.year, dayParts.month, dayParts.day, Math.floor(minutes / 60), minutes % 60, timeZone);
        items.push({
          value: date.toISOString(),
          label: formatScheduleOptionLabel(date, from, timeZone),
        });
        if (items.length >= limit) return items;
      }
    }
  }

  return items;
}

export function formatScheduledFor(value?: string | null, reference = new Date(), timeZone = RECIFE_TIME_ZONE): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatScheduleOptionLabel(date, reference, timeZone);
}

export function formatScheduleDayRanges(schedule: WeeklySchedule | null | undefined, day: Weekday): string {
  const ranges = getRangesForDay(schedule, day);
  if (ranges.length === 0) return 'Fechado';
  return ranges.map((range) => `${range.start} às ${range.end}`).join(' / ');
}

export function getShortDayName(day: Weekday): string {
  return SHORT_DAY_NAMES[day];
}

export function getZonedParts(date: Date, timeZone = RECIFE_TIME_ZONE): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const values: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }

  const weekdays: Record<string, Weekday> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    weekday: weekdays[values.weekday] ?? 0,
  };
}

function getRawRanges(schedule: WeeklySchedule | null | undefined, day: number): TimeRange[] {
  if (!schedule) return [];
  const numeric = (schedule as Record<number, TimeRange[] | undefined>)[day];
  const stringKey = (schedule as Record<string, TimeRange[] | undefined>)[String(day)];
  return Array.isArray(numeric) ? numeric : Array.isArray(stringKey) ? stringKey : [];
}

function getOverlappingRanges(rules: ScheduleRule[], day: Weekday): MinuteRange[] {
  let ranges: MinuteRange[] = [ALL_DAY_RANGE];

  for (const rule of rules) {
    const configured = hasConfiguredSchedule(rule.schedule);
    const ruleRanges = configured
      ? getRangesForDay(rule.schedule, day).map((range) => ({ start: timeToMinutes(range.start), end: timeToMinutes(range.end) }))
      : rule.defaultAvailable
        ? [ALL_DAY_RANGE]
        : [];

    ranges = intersectRanges(ranges, ruleRanges);
    if (ranges.length === 0) break;
  }

  return ranges;
}

function intersectRanges(left: MinuteRange[], right: MinuteRange[]): MinuteRange[] {
  const result: MinuteRange[] = [];
  for (const a of left) {
    for (const b of right) {
      const start = Math.max(a.start, b.start);
      const end = Math.min(a.end, b.end);
      if (start < end) result.push({ start, end });
    }
  }
  return result.sort((a, b) => a.start - b.start);
}

function findNextAvailability(
  rules: ScheduleRule[],
  from: Date,
  options: { timeZone: string; maxDays: number },
): Date | null {
  const currentParts = getZonedParts(from, options.timeZone);
  const currentMinutes = currentParts.hour * 60 + currentParts.minute;

  for (let offset = 0; offset <= options.maxDays; offset++) {
    const dayParts = getLocalDateOffset(from, offset, options.timeZone);
    const ranges = getOverlappingRanges(rules, dayParts.weekday);

    for (const range of ranges) {
      if (offset === 0) {
        if (currentMinutes >= range.start && currentMinutes < range.end) return from;
        if (range.start <= currentMinutes) continue;
      }
      return zonedTimeToDate(dayParts.year, dayParts.month, dayParts.day, Math.floor(range.start / 60), range.start % 60, options.timeZone);
    }
  }

  return null;
}

function getLocalDateOffset(from: Date, dayOffset: number, timeZone: string): ZonedParts {
  const parts = getZonedParts(from, timeZone);
  const noon = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset, 12, 0, 0));
  return getZonedParts(noon, timeZone);
}

function zonedTimeToDate(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  for (let i = 0; i < 2; i++) {
    const parts = getZonedParts(utc, timeZone);
    const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    const actualAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    utc = new Date(utc.getTime() - (actualAsUtc - desiredAsUtc));
  }

  return utc;
}

function formatNextAvailableLabel(next: Date, reference: Date, timeZone: string): string {
  return `Disponível ${formatRelativeDateTime(next, reference, timeZone)}`;
}

function formatScheduleOptionLabel(date: Date, reference: Date, timeZone: string): string {
  return formatRelativeDateTime(date, reference, timeZone);
}

function formatRelativeDateTime(date: Date, reference: Date, timeZone: string): string {
  const dateParts = getZonedParts(date, timeZone);
  const refParts = getZonedParts(reference, timeZone);
  const tomorrowParts = getLocalDateOffset(reference, 1, timeZone);
  const time = `${String(dateParts.hour).padStart(2, '0')}:${String(dateParts.minute).padStart(2, '0')}`;

  if (sameLocalDate(dateParts, refParts)) return `hoje às ${time}`;
  if (sameLocalDate(dateParts, tomorrowParts)) return `amanhã às ${time}`;
  return `${DAY_NAMES[dateParts.weekday]} às ${time}`;
}

function sameLocalDate(left: ZonedParts, right: ZonedParts): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

function roundUp(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}
