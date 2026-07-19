export type Priority = "high" | "medium" | "low" | "none";

export type TaskStatus = "inbox" | "today" | "done";

export interface Task {
  id: string;
  title: string;
  sourceText: string;
  priority: Priority;
  estimatedMinutes: number | null;
  deadline: string | null;
  status: TaskStatus;
  scheduledDate: string | null;
  position: number;
  createdAt: string;
  completedAt: string | null;
}

export interface ParsedTaskDraft {
  title: string;
  sourceText: string;
  priority: Priority;
  estimatedMinutes: number | null;
  deadline: string | null;
}
