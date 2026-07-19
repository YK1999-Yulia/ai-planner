const PREFIX = "ai-planner:plan-generated:";

export function hasGeneratedPlan(date: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREFIX + date) === "1";
}

export function markPlanGenerated(date: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFIX + date, "1");
}
