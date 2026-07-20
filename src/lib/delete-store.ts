import type { Task } from "./types";
import { deleteTaskById } from "./tasks-store";

const DELETE_DELAY_MS = 3500;

interface PendingEntry {
  task: Task;
  timeoutId: ReturnType<typeof setTimeout>;
}

/**
 * Module-level (not component-level) so delete timers survive navigating
 * between tabs — a page unmounting must never cancel a pending deletion.
 *
 * A queue, not a single slot: scheduling a new deletion must never commit
 * an earlier one early. Each task gets its own independent 3.5s timer;
 * the undo toast only ever shows/undoes the most recently scheduled one,
 * earlier ones keep running in the background and commit on their own time.
 */
const pending = new Map<string, PendingEntry>();
const listeners = new Set<() => void>();

const EMPTY_IDS: string[] = [];
let idsSnapshot: string[] = EMPTY_IDS;
let latestSnapshot: Task | null = null;

function recomputeSnapshots() {
  const entries = Array.from(pending.values());
  idsSnapshot = entries.length > 0 ? entries.map((e) => e.task.id) : EMPTY_IDS;
  latestSnapshot = entries.length > 0 ? entries[entries.length - 1].task : null;
}

function emit() {
  recomputeSnapshots();
  for (const listener of listeners) listener();
}

export function subscribeDelete(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Most recently scheduled deletion — what the undo toast shows and undoes. */
export function getPendingDelete(): Task | null {
  return latestSnapshot;
}

export function getPendingDeleteServerSnapshot(): Task | null {
  return null;
}

/** Every task currently mid-deletion, regardless of toast visibility — use to hide them from lists. */
export function getPendingDeleteIds(): string[] {
  return idsSnapshot;
}

export function getPendingDeleteIdsServerSnapshot(): string[] {
  return EMPTY_IDS;
}

export function scheduleDelete(task: Task) {
  const existing = pending.get(task.id);
  if (existing) clearTimeout(existing.timeoutId);
  const timeoutId = setTimeout(() => {
    pending.delete(task.id);
    deleteTaskById(task.id);
    emit();
  }, DELETE_DELAY_MS);
  pending.set(task.id, { task, timeoutId });
  emit();
}

/** Undoes only the most recently scheduled deletion; earlier ones keep their own timers. */
export function undoPendingDelete() {
  if (!latestSnapshot) return;
  const entry = pending.get(latestSnapshot.id);
  if (!entry) return;
  clearTimeout(entry.timeoutId);
  pending.delete(latestSnapshot.id);
  emit();
}
