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

/**
 * Filled pill-chip style. Own palette, deliberately separate from the
 * app accent (#b5cff8), so priority never gets mistaken for app chrome.
 */
export const PRIORITY_CHIP_STYLES: Record<Priority, string> = {
  high: "bg-priority-high text-priority-foreground",
  medium: "bg-priority-medium text-priority-foreground",
  low: "bg-priority-low text-priority-foreground",
  none: "bg-neutral-800 text-neutral-500",
};

/** Left-border stripe color per priority; low/none get no stripe. */
export const PRIORITY_STRIPE_COLORS: Record<Priority, string> = {
  high: "border-l-priority-high",
  medium: "border-l-priority-medium",
  low: "border-l-transparent",
  none: "border-l-transparent",
};

/** Small filled-dot background per priority, e.g. the Week day-strip indicators. */
export const PRIORITY_DOT_COLORS: Record<Priority, string> = {
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
  none: "bg-neutral-500",
};
