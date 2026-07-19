export type Priority = "high" | "medium" | "low" | "none";

export interface Task {
  id: string;
  title: string;
  sourceText: string;
  priority: Priority;
  estimatedMinutes: number | null;
  deadline: string | null;
  scheduledDate: string | null;
  position: number;
  createdAt: string;
  completedAt: string | null;
  /** True for tasks created via Capture's "Спробувати з прикладом" button. */
  isExample?: boolean;
}

export interface ParsedTaskDraft {
  title: string;
  sourceText: string;
  priority: Priority;
  estimatedMinutes: number | null;
  deadline: string | null;
  scheduledDate: string | null;
}
