"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadTasks, updateTask, deleteTask } from "@/lib/tasks-storage";
import { PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/priority";
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

export default function InboxPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTasks(loadTasks().filter((t) => t.status === "inbox"));
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function toggleDone(task: Task) {
    const done = task.completedAt !== null;
    updateTask(task.id, { completedAt: done ? null : new Date().toISOString() });
    setTasks(loadTasks().filter((t) => t.status === "inbox"));
  }

  function remove(task: Task) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      if (pendingDelete) deleteTask(pendingDelete.id);
    }
    setPendingDelete(task);
    timeoutRef.current = setTimeout(() => {
      deleteTask(task.id);
      setTasks(loadTasks().filter((t) => t.status === "inbox"));
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
        <h1 className="mb-2 text-2xl font-semibold text-neutral-100">
          Тут порожньо
        </h1>
        <p className="mb-6 text-neutral-400">
          Вивали думки на екрані &laquo;Занотувати&raquo; — і задачі
          з&apos;являться тут.
        </p>
        <Link
          href="/"
          className="rounded-2xl bg-neutral-100 px-6 py-3 text-base font-semibold text-neutral-950"
        >
          Занотувати
        </Link>
      </main>
    );
  }

  const visibleTasks = tasks.filter((t) => t.id !== pendingDelete?.id);
  const active = sortActive(visibleTasks.filter((t) => t.completedAt === null));
  const done = sortDone(visibleTasks.filter((t) => t.completedAt !== null));

  function renderTask(task: Task) {
    const isDone = task.completedAt !== null;
    return (
      <div
        key={task.id}
        className="flex items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
      >
        <button
          onClick={() => toggleDone(task)}
          aria-label={isDone ? "Позначити невиконаною" : "Позначити виконаною"}
          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
            isDone
              ? "border-neutral-500 bg-neutral-500 text-neutral-950"
              : "border-neutral-600"
          }`}
        >
          {isDone && "✓"}
        </button>

        <div className="flex-1">
          <p
            className={`text-base ${
              isDone ? "text-neutral-500 line-through" : "text-neutral-100"
            }`}
          >
            {task.title}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
            <span className={PRIORITY_COLORS[task.priority]}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            {task.estimatedMinutes && <span>{task.estimatedMinutes} хв</span>}
            {task.deadline && <span>до {task.deadline}</span>}
          </div>
        </div>

        <button
          onClick={() => remove(task)}
          aria-label="Видалити задачу"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-neutral-600"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-dvh px-4 pb-8 pt-6">
      <h1 className="mb-4 text-2xl font-semibold text-neutral-100">Вхідні</h1>

      <div className="flex flex-col gap-3">{active.map(renderTask)}</div>

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
            <div className="mt-2 flex flex-col gap-3">{done.map(renderTask)}</div>
          )}
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-x-4 bottom-20 z-20 flex items-center justify-between rounded-2xl bg-neutral-800 px-4 py-3 shadow-lg">
          <span className="truncate text-sm text-neutral-200">
            Видалено &middot; {pendingDelete.title}
          </span>
          <button
            onClick={undoDelete}
            className="ml-3 shrink-0 text-sm font-semibold text-neutral-100"
          >
            Повернути
          </button>
        </div>
      )}
    </main>
  );
}
