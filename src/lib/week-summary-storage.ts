const PREFIX = "ai-planner:week-summary:";

interface WeekSummaryRecord {
  taskIds: string[];
  summary: string;
}

/** Keyed by the week's Monday date string, so each displayed week keeps its own summary. */
export function getWeekSummary(weekKey: string): WeekSummaryRecord | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PREFIX + weekKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WeekSummaryRecord;
    return typeof parsed.summary === "string" && Array.isArray(parsed.taskIds) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveWeekSummary(weekKey: string, taskIds: string[], summary: string) {
  if (typeof window === "undefined") return;
  const record: WeekSummaryRecord = { taskIds: [...taskIds].sort(), summary };
  localStorage.setItem(PREFIX + weekKey, JSON.stringify(record));
}
