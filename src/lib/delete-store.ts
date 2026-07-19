import type { Task } from "./types";
import { deleteTaskById } from "./tasks-store";

const DELETE_DELAY_MS = 3500;

let pending: { task: Task; timeoutId: ReturnType<typeof setTimeout> } | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Module-level (not component-level) so the delete timer survives navigating
 * between tabs — a page unmounting must never cancel a pending deletion.
 */
export function subscribeDelete(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingDelete(): Task | null {
  return pending?.task ?? null;
}

export function getPendingDeleteServerSnapshot(): Task | null {
  return null;
}

export function scheduleDelete(task: Task) {
  if (pending) {
    clearTimeout(pending.timeoutId);
    deleteTaskById(pending.task.id);
  }
  const timeoutId = setTimeout(() => {
    deleteTaskById(task.id);
    pending = null;
    emit();
  }, DELETE_DELAY_MS);
  pending = { task, timeoutId };
  emit();
}

export function undoPendingDelete() {
  if (!pending) return;
  clearTimeout(pending.timeoutId);
  pending = null;
  emit();
}
