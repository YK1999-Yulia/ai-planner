import type { Task } from "./types";

const STORAGE_KEY = "ai-planner:tasks";

let tasks: Task[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function readFromStorage(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  tasks = readFromStorage();
  initialized = true;
}

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Module-level store (not React state) so every page reads the same
 * in-memory snapshot synchronously — no per-page "loading" render before
 * localStorage is read, and no per-page re-fetching after a mutation.
 */
export function subscribeTasks(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTasksSnapshot(): Task[] {
  ensureInitialized();
  return tasks;
}

export function getTasksServerSnapshot(): Task[] {
  return [];
}

export function addTasks(newTasks: Task[]) {
  ensureInitialized();
  tasks = [...tasks, ...newTasks];
  persist();
  emit();
}

export function updateTaskById(id: string, patch: Partial<Task>) {
  ensureInitialized();
  tasks = tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
  persist();
  emit();
}

export function deleteTaskById(id: string) {
  ensureInitialized();
  tasks = tasks.filter((t) => t.id !== id);
  persist();
  emit();
}

export function deleteTasksByIds(ids: string[]) {
  ensureInitialized();
  const idSet = new Set(ids);
  tasks = tasks.filter((t) => !idSet.has(t.id));
  persist();
  emit();
}
