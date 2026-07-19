import type { Priority } from "./types";

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "Високий",
  medium: "Середній",
  low: "Низький",
  none: "Без пріоритету",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-sky-400",
  none: "text-neutral-500",
};
