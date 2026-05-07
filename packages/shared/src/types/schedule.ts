export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TimeRange {
  start: string;
  end: string;
}

export type WeeklySchedule = Partial<Record<Weekday, TimeRange[]>>;

export interface ScheduleAvailability {
  available: boolean;
  nextAvailableAt?: string;
  nextAvailableLabel?: string;
}

export interface ScheduleOption {
  value: string;
  label: string;
}
