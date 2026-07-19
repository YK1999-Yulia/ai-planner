const NAME_KEY = "ai-planner:user-name";

export function getUserName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function setUserName(name: string) {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (trimmed) {
    localStorage.setItem(NAME_KEY, trimmed);
  } else {
    localStorage.removeItem(NAME_KEY);
  }
}
