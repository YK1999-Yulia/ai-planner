import type { Task } from "./types";

const STORAGE_KEY = "ai-planner:tasks";

export function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function addTasks(newTasks: Task[]) {
  saveTasks([...loadTasks(), ...newTasks]);
}

export function updateTask(id: string, patch: Partial<Task>) {
  saveTasks(loadTasks().map((t) => (t.id === id ? { ...t, ...patch } : t)));
}

export function deleteTask(id: string) {
  saveTasks(loadTasks().filter((t) => t.id !== id));
}
