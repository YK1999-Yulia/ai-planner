const STORAGE_KEY = "ai-planner:settings";

export interface DaySettings {
  dayStart: string;
  dayEnd: string;
}

const DEFAULT_SETTINGS: DaySettings = {
  dayStart: "09:00",
  dayEnd: "18:00",
};

export function loadSettings(): DaySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: DaySettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
