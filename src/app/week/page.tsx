"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  subscribeTasks,
  getTasksSnapshot,
  getTasksServerSnapshot,
  updateTaskById,
} from "@/lib/tasks-store";
import {
  subscribeDelete,
  getPendingDelete,
  getPendingDeleteServerSnapshot,
  scheduleDelete,
  undoPendingDelete,
} from "@/lib/delete-store";
import { TaskCard } from "@/components/TaskCard";
import { DaySelect } from "@/components/DaySelect";
import {
  weekDates,
  todayString,
  formatWeekRangeLabel,
  WEEKDAY_SHORT,
  WEEKDAY_FULL,
  weekdayIndex,
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

export default function WeekPage() {
  const allTasks = useSyncExternalStore(
    subscribeTasks,
    getTasksSnapshot,
    getTasksServerSnapshot,
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const dates = weekDates(0);
    const today = todayString();
    return dates.includes(today) ? today : dates[0];
  });
  const [distributing, setDistributing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const pendingDelete = useSyncExternalStore(
    subscribeDelete,
    getPendingDelete,
    getPendingDeleteServerSnapshot,
  );

  useEffect(() => {
    const dates = weekDates(weekOffset);
    const today = todayString();
    setSelectedDate(dates.includes(today) ? today : dates[0]);
  }, [weekOffset]);

  function toggleDone(task: Task) {
    const done = task.completedAt !== null;
    updateTaskById(task.id, { completedAt: done ? null : new Date().toISOString() });
  }

  function update(id: string, patch: Partial<Task>) {
    updateTaskById(id, patch);
  }

  function remove(task: Task) {
    scheduleDelete(task);
  }

  function undoDelete() {
    undoPendingDelete();
  }

  async function distributeWeek() {
    const dates = weekDates(weekOffset);
    const candidates = allTasks.filter(
      (t) => t.scheduledDate === null && t.completedAt === null,
    );

    if (candidates.length === 0) {
      setError("Немає незапланованих задач у Вхідних для розподілу.");
      return;
    }

    const existingLoad = dates.map((date) => {
      const dayTasks = allTasks.filter(
        (t) => t.scheduledDate === date && t.completedAt === null,
      );
      return {
        date,
        taskCount: dayTasks.length,
        minutes: dayTasks.reduce((sum, t) => sum + ((t.estimatedMinutes && t.estimatedMinutes > 0 ? t.estimatedMinutes : 30)), 0),
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
          weekDates: dates,
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

  function updatePreviewRow(id: string, scheduledDate: string | null) {
    setPreview((prev) =>
      prev
        ? prev.map((r) => (r.id === id ? { ...r, scheduledDate: scheduledDate ?? r.scheduledDate } : r))
        : prev,
    );
  }

  function confirmPreview() {
    if (!preview) return;
    for (const row of preview) {
      updateTaskById(row.id, { scheduledDate: row.scheduledDate });
    }
    setPreview(null);
  }

  const dates = weekDates(weekOffset);
  const today = todayString();
  const visibleTasks = allTasks.filter((t) => t.id !== pendingDelete?.id);

  if (preview) {
    return (
      <main className="min-h-dvh px-4 pb-8 pt-6">
        <h1 className="mb-1 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
          Перевір розподіл
        </h1>
        <p className="mb-4 text-sm text-neutral-400">
          Зміни день, де треба, а потім застосуй.
        </p>

        <div className="flex flex-col gap-3">
          {preview.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-card p-5 animate-[fadeInUp_0.2s_ease-out]"
            >
              <span className="flex-1 text-base text-white">{row.title}</span>
              <DaySelect
                value={row.scheduledDate}
                onChange={(value) => updatePreviewRow(row.id, value)}
                excludeNone
                className="rounded-lg bg-neutral-800 px-2 py-2 text-sm text-neutral-200"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={confirmPreview}
            className="w-full rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground"
          >
            Застосувати
          </button>
          <button
            onClick={() => setPreview(null)}
            className="w-full rounded-full bg-neutral-800 py-3 text-base text-neutral-300"
          >
            Скасувати
          </button>
        </div>
      </main>
    );
  }

  const dayTasks = sortDay(visibleTasks.filter((t) => t.scheduledDate === selectedDate));
  const activeCount = dayTasks.filter((t) => t.completedAt === null).length;
  const minutes = dayTasks
    .filter((t) => t.completedAt === null)
    .reduce((sum, t) => sum + ((t.estimatedMinutes && t.estimatedMinutes > 0 ? t.estimatedMinutes : 30)), 0);

  return (
    <main className="min-h-dvh px-4 pb-8 pt-6">
      <h1 className="mb-4 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
        Тиждень
      </h1>

      <button
        onClick={distributeWeek}
        disabled={distributing}
        className="mb-4 w-full rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground disabled:opacity-40"
      >
        {distributing ? "Розподіляю..." : "Розподілити тиждень AI"}
      </button>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
          disabled={weekOffset === 0}
          aria-label="Попередній тиждень"
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-neutral-400 disabled:opacity-30"
        >
          ←
        </button>
        <span className="text-sm font-medium text-neutral-300">
          {formatWeekRangeLabel(dates)}
        </span>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          aria-label="Наступний тиждень"
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-neutral-400"
        >
          →
        </button>
      </div>

      <div className="mb-6 grid grid-cols-7 gap-1">
        {dates.map((date) => {
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const count = visibleTasks.filter(
            (t) => t.scheduledDate === date && t.completedAt === null,
          ).length;
          const dayNum = Number(date.split("-")[2]);

          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 transition-colors duration-150 ${
                isSelected
                  ? "bg-accent text-accent-foreground"
                  : isToday
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400"
              }`}
            >
              <span className="text-xs">{WEEKDAY_SHORT[weekdayIndex(date)]}</span>
              <span className="text-base font-semibold">{dayNum}</span>
              <span className="flex h-1.5 gap-0.5">
                {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 w-1 rounded-full ${
                      isSelected ? "bg-accent-foreground" : "bg-current"
                    }`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="font-[family-name:var(--font-heading)] text-base font-bold text-white">
          {WEEKDAY_FULL[weekdayIndex(selectedDate)]}
          {selectedDate === today && (
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
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
        <p className="px-1 text-sm text-neutral-600">Немає задач на цей день</p>
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
