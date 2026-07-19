import type { Priority } from "./types";

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "Високий",
  medium: "Середній",
  low: "Низький",
  none: "Без пріоритету",
};

/** Text-only color, used where a plain colored label fits better than a filled chip. */
export const PRIORITY_COLORS: Record<Priority, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-sky-400",
  none: "text-neutral-500",
};

/** Filled pill-chip style: high priority uses the app accent, others keep a small color cue. */
export const PRIORITY_CHIP_STYLES: Record<Priority, string> = {
  high: "bg-accent text-accent-foreground",
  medium: "bg-amber-300 text-amber-950",
  low: "bg-neutral-700 text-neutral-200",
  none: "bg-neutral-800 text-neutral-500",
};
