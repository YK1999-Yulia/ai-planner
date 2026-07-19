const WELCOME_KEY = "ai-planner:welcome-seen";
const TIP_PREFIX = "ai-planner:tip-seen:";

export function hasSeenWelcome(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(WELCOME_KEY) === "1";
}

export function markWelcomeSeen() {
  if (typeof window === "undefined") return;
  localStorage.setItem(WELCOME_KEY, "1");
}

export function hasSeenTip(key: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(TIP_PREFIX + key) === "1";
}

export function markTipSeen(key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TIP_PREFIX + key, "1");
}
