"use client";

import { useEffect, useRef, useState } from "react";
import { loadTasks, updateTask, deleteTask } from "@/lib/tasks-storage";
import { TaskCard } from "@/components/TaskCard";
import {
  currentWeekDates,
  todayString,
  WEEKDAY_FULL,
  weekdayIndex,
  dayOptions,
} from "@/lib/date";
import type { Priority, Task } from "@/lib/types";

const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

function sortDay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (rankDiff !== 0) return rankDiff;
    return (a.deadline ?? "9999-99-99").localeCompare(b.deadline ?? "9999-99-99");
  });
}

function pluralTasks(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "задача";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "задачі";
  return "задач";
}

function formatHours(totalMinutes: number): string {
  const hours = totalMinutes / 60;
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}

interface PreviewRow {
  id: string;
  title: string;
  scheduledDate: string;
}

const DELETE_DELAY_MS = 3500;

export default function WeekPage() {
  const [allTasks, setAllTasks] = useState<Task[] | null>(null);
  const [distributing, setDistributing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAllTasks(loadTasks());
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function refresh() {
    setAllTasks(loadTasks());
  }

  function toggleDone(task: Task) {
    const done = task.completedAt !== null;
    updateTask(task.id, { completedAt: done ? null : new Date().toISOString() });
    refresh();
  }

  function update(id: string, patch: Partial<Task>) {
    updateTask(id, patch);
    refresh();
  }

  function remove(task: Task) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      if (pendingDelete) deleteTask(pendingDelete.id);
    }
    setPendingDelete(task);
    timeoutRef.current = setTimeout(() => {
      deleteTask(task.id);
      refresh();
      setPendingDelete(null);
    }, DELETE_DELAY_MS);
  }

  function undoDelete() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPendingDelete(null);
  }

  async function distributeWeek() {
    if (!allTasks) return;
    const weekDates = currentWeekDates();
    const candidates = allTasks.filter(
      (t) => t.scheduledDate === null && t.completedAt === null,
    );

    if (candidates.length === 0) {
      setError("Немає незапланованих задач у Вхідних для розподілу.");
      return;
    }

    const existingLoad = weekDates.map((date) => {
      const dayTasks = allTasks.filter(
        (t) => t.scheduledDate === date && t.completedAt === null,
      );
      return {
        date,
        taskCount: dayTasks.length,
        minutes: dayTasks.reduce((sum, t) => sum + (t.estimatedMinutes ?? 30), 0),
      };
    });

    setDistributing(true);
    setError(null);
    try {
      const res = await fetch("/api/plan-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: candidates.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            estimatedMinutes: t.estimatedMinutes,
            deadline: t.deadline,
          })),
          weekDates,
          existingLoad,
          today: todayString(),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Не вдалося розподілити тиждень");
        return;
      }
      if (data.assignments.length === 0) {
        setError("AI не зміг розподілити задачі. Спробуй пізніше.");
        return;
      }

      const rows: PreviewRow[] = (
        data.assignments as { id: string; scheduledDate: string }[]
      ).map((a) => {
        const task = candidates.find((c) => c.id === a.id);
        return { id: a.id, title: task?.title ?? "", scheduledDate: a.scheduledDate };
      });
      setPreview(rows);
    } catch {
      setError("Не вдалося зв'язатися з сервером");
    } finally {
      setDistributing(false);
    }
  }

  function updatePreviewRow(id: string, scheduledDate: string) {
    setPreview((prev) =>
      prev ? prev.map((r) => (r.id === id ? { ...r, scheduledDate } : r)) : prev,
    );
  }

  function confirmPreview() {
    if (!preview) return;
    for (const row of preview) {
      updateTask(row.id, { scheduledDate: row.scheduledDate });
    }
    setPreview(null);
    refresh();
  }

  if (allTasks === null) {
    return null;
  }

  const weekDates = currentWeekDates();
  const today = todayString();
  const weekOptions = dayOptions();
  const visibleTasks = allTasks.filter((t) => t.id !== pendingDelete?.id);

  const hasAnyScheduled = weekDates.some((date) =>
    visibleTasks.some((t) => t.scheduledDate === date),
  );

  if (preview) {
    return (
      <main className="min-h-dvh px-4 pb-8 pt-6">
        <h1 className="mb-1 text-2xl font-bold text-neutral-100">Перевір розподіл</h1>
        <p className="mb-4 text-sm text-neutral-400">
          Зміни день, де треба, а потім застосуй.
        </p>

        <div className="flex flex-col gap-3">
          {preview.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 animate-[fadeInUp_0.2s_ease-out]"
            >
              <span className="flex-1 text-base text-neutral-100">{row.title}</span>
              <select
                value={row.scheduledDate}
                onChange={(e) => updatePreviewRow(row.id, e.target.value)}
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-2 text-sm text-neutral-200"
              >
                {weekOptions
                  .filter((o) => o.value !== null)
                  .map((o) => (
                    <option key={o.value} value={o.value as string}>
                      {o.label}
                    </option>
                  ))}
              </select>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={confirmPreview}
            className="w-full rounded-2xl bg-neutral-100 py-4 text-lg font-semibold text-neutral-950"
          >
            Застосувати
          </button>
          <button
            onClick={() => setPreview(null)}
            className="w-full rounded-2xl border border-neutral-700 py-3 text-base text-neutral-300"
          >
            Скасувати
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh px-4 pb-8 pt-6">
      <h1 className="mb-4 text-2xl font-bold text-neutral-100">Тиждень</h1>

      <button
        onClick={distributeWeek}
        disabled={distributing}
        className="mb-4 w-full rounded-2xl bg-neutral-100 py-4 text-lg font-semibold text-neutral-950 disabled:opacity-40"
      >
        {distributing ? "Розподіляю..." : "Розподілити тиждень AI"}
      </button>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {!hasAnyScheduled ? (
        <p className="py-10 text-center text-neutral-400">
          Тиждень порожній. Натисни &laquo;Розподілити тиждень&raquo; — я розкладу
          задачі за тебе.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {weekDates.map((date) => {
            const dayTasks = sortDay(
              visibleTasks.filter((t) => t.scheduledDate === date),
            );
            const activeCount = dayTasks.filter((t) => t.completedAt === null).length;
            const minutes = dayTasks
              .filter((t) => t.completedAt === null)
              .reduce((sum, t) => sum + (t.estimatedMinutes ?? 30), 0);
            const isToday = date === today;
            const [, month, day] = date.split("-");

            return (
              <div key={date}>
                <div
                  className={`mb-2 flex items-baseline justify-between rounded-xl px-1 ${
                    isToday ? "text-neutral-100" : "text-neutral-300"
                  }`}
                >
                  <h2 className="text-base font-semibold">
                    {WEEKDAY_FULL[weekdayIndex(date)]}
                    <span className="ml-2 text-sm font-normal text-neutral-500">
                      {day}.{month}
                    </span>
                    {isToday && (
                      <span className="ml-2 rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-300">
                        сьогодні
                      </span>
                    )}
                  </h2>
                  {dayTasks.length > 0 && (
                    <span className="text-xs text-neutral-500">
                      {activeCount} {pluralTasks(activeCount)} &middot; {formatHours(minutes)} год
                    </span>
                  )}
                </div>

                {dayTasks.length === 0 ? (
                  <p className="px-1 text-sm text-neutral-600">Немає задач</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {dayTasks.map((task) => (
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
            );
          })}
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
