export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export const WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
export const WEEKDAY_FULL = [
  "Понеділок",
  "Вівторок",
  "Середа",
  "Четвер",
  "П'ятниця",
  "Субота",
  "Неділя",
];

/** 0 = Monday .. 6 = Sunday */
export function weekdayIndex(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

export function currentWeekDates(referenceDate: Date = new Date()): string[] {
  const today = toDateString(referenceDate);
  const monday = addDays(today, -weekdayIndex(today));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}.${m}`;
}

export interface DayOption {
  value: string | null;
  label: string;
}

export function dayOptions(referenceDate: Date = new Date()): DayOption[] {
  const today = toDateString(referenceDate);
  const tomorrow = addDays(today, 1);
  const week = currentWeekDates(referenceDate);

  const options: DayOption[] = [
    { value: null, label: "Без дня" },
    { value: today, label: "Сьогодні" },
    { value: tomorrow, label: "Завтра" },
  ];

  for (const date of week) {
    if (date === today || date === tomorrow || date < today) continue;
    options.push({ value: date, label: WEEKDAY_SHORT[weekdayIndex(date)] });
  }

  return options;
}
