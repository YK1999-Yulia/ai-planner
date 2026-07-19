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
export const MONTH_GENITIVE = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
];

/** 0 = Monday .. 6 = Sunday */
export function weekdayIndex(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

/** weekOffset 0 = the week containing today, 1 = next week, etc. Never negative. */
export function weekDates(weekOffset: number, referenceDate: Date = new Date()): string[] {
  const today = toDateString(referenceDate);
  const monday = addDays(today, -weekdayIndex(today) + Math.max(weekOffset, 0) * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function currentWeekDates(referenceDate: Date = new Date()): string[] {
  return weekDates(0, referenceDate);
}

export function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}.${m}`;
}

export function formatWeekRangeLabel(dates: string[]): string {
  const first = dates[0];
  const last = dates[dates.length - 1];
  const [, fm, fd] = first.split("-").map(Number);
  const [, lm, ld] = last.split("-").map(Number);
  if (fm === lm) {
    return `${fd}–${ld} ${MONTH_GENITIVE[fm - 1]}`;
  }
  return `${fd} ${MONTH_GENITIVE[fm - 1]} – ${ld} ${MONTH_GENITIVE[lm - 1]}`;
}

export interface DayOption {
  value: string | null;
  label: string;
  group?: string;
}

export function dayOptions(referenceDate: Date = new Date()): DayOption[] {
  const today = toDateString(referenceDate);
  const tomorrow = addDays(today, 1);
  const thisWeek = weekDates(0, referenceDate);
  const nextWeek = weekDates(1, referenceDate);

  const options: DayOption[] = [
    { value: null, label: "Без дня" },
    { value: today, label: "Сьогодні" },
    { value: tomorrow, label: "Завтра" },
  ];

  for (const date of thisWeek) {
    if (date === today || date === tomorrow || date < today) continue;
    options.push({ value: date, label: WEEKDAY_SHORT[weekdayIndex(date)] });
  }

  for (const date of nextWeek) {
    options.push({
      value: date,
      label: WEEKDAY_SHORT[weekdayIndex(date)],
      group: "Наступний тиждень →",
    });
  }

  return options;
}
