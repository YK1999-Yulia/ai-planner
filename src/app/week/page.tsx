"use client";

import { useState, useSyncExternalStore } from "react";
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
  getPendingDeleteIds,
  getPendingDeleteIdsServerSnapshot,
  scheduleDelete,
  undoPendingDelete,
} from "@/lib/delete-store";
import { hasSeenTip, markTipSeen } from "@/lib/onboarding-storage";
import { TaskCard } from "@/components/TaskCard";
import { DaySelect } from "@/components/DaySelect";
import { TipBanner } from "@/components/TipBanner";
import {
  weekDates,
  todayString,
  formatWeekRangeLabel,
  WEEKDAY_SHORT,
  WEEKDAY_FULL,
  MONTH_GENITIVE,
  weekdayIndex,
} from "@/lib/date";
import { pluralTasks, formatHoursApprox } from "@/lib/format";
import { isArchived } from "@/lib/archive";
import { vibrate } from "@/lib/haptics";
import { TAP_ACTIVE, TAP_TARGET_44 } from "@/lib/ui";
import { AI_ERROR_MESSAGE } from "@/lib/errors";
import type { Priority, Task } from "@/lib/types";

const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (rankDiff !== 0) return rankDiff;
    return (a.deadline ?? "9999-99-99").localeCompare(b.deadline ?? "9999-99-99");
  });
}

function sortByDay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const dayDiff = (a.scheduledDate as string).localeCompare(b.scheduledDate as string);
    if (dayDiff !== 0) return dayDiff;
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  });
}

function formatDayPanelHeader(date: string, tasks: Task[]): string {
  const [, m, d] = date.split("-").map(Number);
  const dayLabel = `${WEEKDAY_FULL[weekdayIndex(date)]}, ${d} ${MONTH_GENITIVE[m - 1]}`;
  if (tasks.length === 0) return dayLabel;
  const minutes = tasks.reduce(
    (sum, t) => sum + (t.estimatedMinutes && t.estimatedMinutes > 0 ? t.estimatedMinutes : 30),
    0,
  );
  return `${dayLabel} · ${tasks.length} ${pluralTasks(tasks.length)} · ${formatHoursApprox(minutes)}`;
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [distributing, setDistributing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [showTip, setShowTip] = useState(() => !hasSeenTip("week"));
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const pendingDelete = useSyncExternalStore(
    subscribeDelete,
    getPendingDelete,
    getPendingDeleteServerSnapshot,
  );
  const pendingDeleteIds = useSyncExternalStore(
    subscribeDelete,
    getPendingDeleteIds,
    getPendingDeleteIdsServerSnapshot,
  );

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

  function selectDay(date: string) {
    setSelectedDate((prev) => (prev === date ? null : date));
  }

  function dismissTip() {
    markTipSeen("week");
    setShowTip(false);
  }

  async function distributeWeek() {
    vibrate(10);
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
        minutes: dayTasks.reduce(
          (sum, t) => sum + (t.estimatedMinutes && t.estimatedMinutes > 0 ? t.estimatedMinutes : 30),
          0,
        ),
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
        console.error(data.error);
        setError(AI_ERROR_MESSAGE);
        return;
      }
      if (data.assignments.length === 0) {
        setError("Не вдалося розподілити задачі. Спробуй пізніше.");
        return;
      }

      const rows: PreviewRow[] = (
        data.assignments as { id: string; scheduledDate: string }[]
      ).map((a) => {
        const task = candidates.find((c) => c.id === a.id);
        return { id: a.id, title: task?.title ?? "", scheduledDate: a.scheduledDate };
      });
      setPreview(rows);
    } catch (err) {
      console.error(err);
      setError(AI_ERROR_MESSAGE);
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
    vibrate(10);
    for (const row of preview) {
      updateTaskById(row.id, { scheduledDate: row.scheduledDate });
    }
    setPreview(null);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  }

  const dates = weekDates(weekOffset);
  const today = todayString();
  const visibleTasks = allTasks.filter((t) => !pendingDeleteIds.includes(t.id));
  const unscheduledCount = visibleTasks.filter(
    (t) => t.scheduledDate === null && t.completedAt === null,
  ).length;

  if (preview) {
    return (
      <main className="min-h-dvh px-4 pb-8 pt-6 animate-[pageFade_0.15s_ease-out]">
        <h1 className="mb-1 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
          Ось як я розклав тиждень. Підходить?
        </h1>
        <p className="mb-4 text-sm text-neutral-400">
          Зміни день, де треба, а потім застосуй.
        </p>

        <div className="flex flex-col gap-3">
          {preview.map((row, index) => (
            <div
              key={row.id}
              style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
              className="flex items-center justify-between gap-3 rounded-2xl bg-card p-5 animate-[fadeInUp_0.2s_ease-out_backwards]"
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
            className={`w-full rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground ${TAP_ACTIVE}`}
          >
            Застосувати
          </button>
          <button
            onClick={() => setPreview(null)}
            className={`w-full rounded-full bg-neutral-800 py-3 text-base text-neutral-300 ${TAP_ACTIVE}`}
          >
            Скасувати
          </button>
        </div>
      </main>
    );
  }

  const todayTasks = sortByPriority(
    visibleTasks.filter((t) => t.scheduledDate === today && !isArchived(t)),
  );

  const weekListTasks = sortByDay(
    visibleTasks.filter(
      (t) =>
        t.scheduledDate !== null &&
        t.scheduledDate !== today &&
        dates.includes(t.scheduledDate) &&
        !isArchived(t),
    ),
  );

  const selectedDayTasks = selectedDate
    ? sortByPriority(
        visibleTasks.filter((t) => t.scheduledDate === selectedDate && !isArchived(t)),
      )
    : [];

  return (
    <main className="min-h-dvh px-4 pb-8 pt-6 animate-[pageFade_0.15s_ease-out]">
      <h1 className="mb-4 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
        Тиждень
      </h1>

      {showTip && (
        <TipBanner
          text="Тут твій тиждень: тапни день, щоб побачити задачі, або натисни «Розкласти по днях» — я сам розкладу все з Вхідних 👆"
          onDismiss={dismissTip}
        />
      )}

      <button
        onClick={distributeWeek}
        disabled={distributing || unscheduledCount === 0}
        className={`mb-1 w-full rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground disabled:opacity-40 ${TAP_ACTIVE}`}
      >
        {distributing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
            Розкладаю...
          </span>
        ) : unscheduledCount === 0 ? (
          "Всі задачі вже розкладені ✓"
        ) : (
          `Розкласти по днях (${unscheduledCount})`
        )}
      </button>
      <p className="mb-4 text-xs text-neutral-500">
        Розкидаю незаплановані задачі по днях тижня — з огляду на дедлайни і пріоритети
      </p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
          disabled={weekOffset === 0}
          aria-label="Попередній тиждень"
          className={`flex h-11 w-11 items-center justify-center rounded-full text-lg text-neutral-400 disabled:opacity-30 ${TAP_ACTIVE}`}
        >
          ←
        </button>
        <span className="text-sm font-medium text-neutral-300">
          {formatWeekRangeLabel(dates)}
        </span>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          aria-label="Наступний тиждень"
          className={`flex h-11 w-11 items-center justify-center rounded-full text-lg text-neutral-400 ${TAP_ACTIVE}`}
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
              onClick={() => selectDay(date)}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 ${TAP_ACTIVE} ${
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

      {selectedDate ? (
        <div className="mb-6 animate-[fadeInUp_0.2s_ease-out_backwards]">
          <h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg font-bold text-white">
            {formatDayPanelHeader(selectedDate, selectedDayTasks)}
          </h2>
          {selectedDayTasks.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="mb-4 text-neutral-400">На цей день нічого не заплановано</p>
              <button
                onClick={distributeWeek}
                disabled={distributing}
                className={`rounded-full bg-neutral-800 px-6 py-3 text-base text-neutral-300 disabled:opacity-40 ${TAP_ACTIVE}`}
              >
                Розкласти по днях
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedDayTasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onToggleDone={toggleDone}
                  onDelete={remove}
                  onUpdate={update}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg font-bold text-white">
              Сьогодні
            </h2>
            {todayTasks.length === 0 ? (
              <p className="text-sm text-neutral-400">
                На сьогодні нічого не заплановано. Тапни день у стрічці або розклади
                тиждень 👆
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {todayTasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    onToggleDone={toggleDone}
                    onDelete={remove}
                    onUpdate={update}
                  />
                ))}
              </div>
            )}
          </div>

          {weekListTasks.length > 0 && (
            <div>
              <h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg font-bold text-white">
                Задачі цього тижня
              </h2>
              <div className="flex flex-col gap-3">
                {weekListTasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    compact
                    dayLabel={WEEKDAY_SHORT[weekdayIndex(task.scheduledDate as string)]}
                    onToggleDone={toggleDone}
                    onDelete={remove}
                    onUpdate={update}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {pendingDelete && (
        <div className="fixed inset-x-4 bottom-20 z-20 flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-lg">
          <span className="truncate text-sm text-neutral-300">
            Видалено &middot; {pendingDelete.title}
          </span>
          <button
            onClick={undoDelete}
            className={`ml-3 shrink-0 text-sm font-semibold text-accent ${TAP_TARGET_44} ${TAP_ACTIVE}`}
          >
            Повернути
          </button>
        </div>
      )}

      {showSuccessToast && (
        <div className="fixed inset-x-4 bottom-20 z-20 rounded-2xl bg-card px-4 py-3 text-center text-sm font-medium text-white shadow-lg animate-[fadeInUp_0.2s_ease-out]">
          Готово! Задачі розкладені по днях
        </div>
      )}
    </main>
  );
}
