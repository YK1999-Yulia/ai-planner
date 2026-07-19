import { toDateString, todayString, addDays, MONTH_GENITIVE } from "./date";
import type { Task } from "./types";

export function completedDateString(task: Task): string | null {
  if (!task.completedAt) return null;
  return toDateString(new Date(task.completedAt));
}

/** A task is archived once it was completed on a day before today. */
export function isArchived(task: Task): boolean {
  const date = completedDateString(task);
  return date !== null && date !== todayString();
}

export function formatArchiveGroupLabel(dateStr: string): string {
  const today = todayString();
  if (dateStr === today) return "Сьогодні";
  if (dateStr === addDays(today, -1)) return "Вчора";
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTH_GENITIVE[m - 1]}`;
}
