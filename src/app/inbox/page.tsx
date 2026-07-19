"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadTasks, updateTask, deleteTask } from "@/lib/tasks-storage";
import { TaskCard } from "@/components/TaskCard";
import type { Priority, Task } from "@/lib/types";

const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

const DELETE_DELAY_MS = 3500;

function sortActive(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (rankDiff !== 0) return rankDiff;
    const ad = a.deadline ?? "9999-99-99";
    const bd = b.deadline ?? "9999-99-99";
    return ad.localeCompare(bd);
  });
}

function sortDone(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
}

function loadInboxTasks(): Task[] {
  return loadTasks().filter((t) => t.scheduledDate === null);
}

export default function InboxPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTasks(loadInboxTasks());
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function toggleDone(task: Task) {
    const done = task.completedAt !== null;
    updateTask(task.id, { completedAt: done ? null : new Date().toISOString() });
    setTasks(loadInboxTasks());
  }

  function update(id: string, patch: Partial<Task>) {
    updateTask(id, patch);
    setTasks(loadInboxTasks());
  }

  function remove(task: Task) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      if (pendingDelete) deleteTask(pendingDelete.id);
    }
    setPendingDelete(task);
    timeoutRef.current = setTimeout(() => {
      deleteTask(task.id);
      setTasks(loadInboxTasks());
      setPendingDelete(null);
    }, DELETE_DELAY_MS);
  }

  function undoDelete() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPendingDelete(null);
  }

  if (tasks === null) {
    return null;
  }

  if (tasks.length === 0) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 pb-8 text-center">
        <h1 className="mb-2 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
          Тут порожньо
        </h1>
        <p className="mb-6 text-neutral-400">
          Вивали думки на екрані &laquo;Занотувати&raquo; — і задачі
          з&apos;являться тут.
        </p>
        <Link
          href="/"
          className="rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground"
        >
          Занотувати
        </Link>
      </main>
    );
  }

  const visibleTasks = tasks.filter((t) => t.id !== pendingDelete?.id);
  const active = sortActive(visibleTasks.filter((t) => t.completedAt === null));
  const done = sortDone(visibleTasks.filter((t) => t.completedAt !== null));

  return (
    <main className="min-h-dvh px-4 pb-8 pt-6">
      <h1 className="mb-4 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
        Вхідні
      </h1>

      <div className="flex flex-col gap-4">
        {active.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggleDone={toggleDone}
            onDelete={remove}
            onUpdate={update}
          />
        ))}
      </div>

      {done.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setDoneExpanded((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm font-medium text-neutral-400"
          >
            <span>Виконано ({done.length})</span>
            <span className={doneExpanded ? "rotate-180" : ""}>⌄</span>
          </button>
          {doneExpanded && (
            <div className="mt-2 flex flex-col gap-4">
              {done.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleDone={toggleDone}
                  onDelete={remove}
                  onUpdate={update}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-x-4 bottom-20 z-20 flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-lg">
          <span className="truncate text-sm text-neutral-300">
            Видалено &middot; {pendingDelete.title}
          </span>
          <button
            onClick={undoDelete}
            className="ml-3 shrink-0 text-sm font-semibold text-accent"
          >
            Повернути
          </button>
        </div>
      )}
    </main>
  );
}
