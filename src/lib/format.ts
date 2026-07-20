function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "дні";
  return "днів";
}

export type DateTone = "today" | "future" | "overdue";

export interface DaysUntilInfo {
  label: string;
  tone: DateTone;
  /** @deprecated kept for callers that only care about red vs not-red */
  overdue: boolean;
}

/**
 * Day-count label for a date, used for both deadlines and overdue
 * scheduled days: "сьогодні" / "завтра" / "3 дні" / "5 днів" / "вчора" /
 * "2 дні тому". No raw dates — those only appear in the edit form.
 */
export function formatDaysUntil(dateStr: string, now: Date = new Date()): DaysUntilInfo {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diff === 0) return { label: "сьогодні", tone: "today", overdue: false };
  if (diff === 1) return { label: "завтра", tone: "future", overdue: false };
  if (diff > 1) return { label: `${diff} ${pluralDays(diff)}`, tone: "future", overdue: false };

  const daysAgo = Math.abs(diff);
  if (daysAgo === 1) return { label: "вчора", tone: "overdue", overdue: true };
  return { label: `${daysAgo} ${pluralDays(daysAgo)} тому`, tone: "overdue", overdue: true };
}

export function pluralTasks(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "задача";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "задачі";
  return "задач";
}

/** "1 прострочена задача" / "3 прострочені задачі" / "5 прострочених задач" */
export function formatOverdueCount(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} прострочена задача`;
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${n} прострочені задачі`;
  return `${n} прострочених задач`;
}

/**
 * Human duration label used everywhere a task/plan duration is shown:
 * "30 хв", "1.5 год", "2 год", "6 год" — never raw minutes like "90 хв".
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} хв`;
  const hours = minutes / 60;
  const rounded = Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
  return `${rounded} год`;
}

/** Time-of-day greeting; omits the name gracefully if none is set. */
export function getGreeting(name: string, now: Date = new Date()): string {
  const hour = now.getHours();
  const suffix = name ? `, ${name}` : "";

  if (hour >= 5 && hour < 12) return `Доброго ранку${suffix} ☀️`;
  if (hour >= 12 && hour < 18) return `Гарного дня${suffix}`;
  if (hour >= 18 && hour < 23) return `Добрий вечір${suffix} 🌙`;
  return `Пізня пташка${suffix}? 🦉`;
}
