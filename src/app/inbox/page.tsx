"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadTasks, updateTask, deleteTask } from "@/lib/tasks-storage";
import type { Priority, Task } from "@/lib/types";

const PRIORITY_LABELS: Record<Priority, string> = {
  high: "Високий",
  medium: "Середній",
  low: "Низький",
  none: "Без пріоритету",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-sky-400",
  none: "text-neutral-500",
};

export default function InboxPage() {
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  function toggleDone(task: Task) {
    const done = task.completedAt !== null;
    updateTask(task.id, { completedAt: done ? null : new Date().toISOString() });
    setTasks(loadTasks());
  }

  function remove(task: Task) {
    deleteTask(task.id);
    setTasks(loadTasks());
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

  return (
    <main className="min-h-dvh px-4 pb-8 pt-6">
      <h1 className="mb-4 text-2xl font-semibold text-neutral-100">Вхідні</h1>

      <div className="flex flex-col gap-3">
        {tasks.map((task) => {
          const done = task.completedAt !== null;
          return (
            <div
              key={task.id}
              className="flex items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
            >
              <button
                onClick={() => toggleDone(task)}
                aria-label={done ? "Позначити невиконаною" : "Позначити виконаною"}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  done
                    ? "border-neutral-500 bg-neutral-500 text-neutral-950"
                    : "border-neutral-600"
                }`}
              >
                {done && "✓"}
              </button>

              <div className="flex-1">
                <p
                  className={`text-base ${
                    done
                      ? "text-neutral-500 line-through"
                      : "text-neutral-100"
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-neutral-600"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
