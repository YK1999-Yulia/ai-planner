const PREFIX = "ai-planner:plan-generated:";

interface PlanRecord {
  taskIds: string[];
}

export function hasGeneratedPlan(date: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREFIX + date) !== null;
}

/** Task ids that made up the plan when it was generated — used to detect staleness. */
export function getGeneratedPlanTaskIds(date: string): string[] | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PREFIX + date);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PlanRecord;
    return Array.isArray(parsed.taskIds) ? parsed.taskIds : null;
  } catch {
    return null;
  }
}

export function markPlanGenerated(date: string, taskIds: string[]) {
  if (typeof window === "undefined") return;
  const record: PlanRecord = { taskIds: [...taskIds].sort() };
  localStorage.setItem(PREFIX + date, JSON.stringify(record));
}
