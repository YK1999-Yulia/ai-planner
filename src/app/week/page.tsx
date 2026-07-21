"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
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
import {
  subscribeArchiveTransition,
  getArchiveTransitionIds,
  getArchiveTransitionIdsServerSnapshot,
  markJustCompleted,
  clearJustCompleted,
} from "@/lib/archive-transition-store";
import { hasSeenTip, markTipSeen } from "@/lib/onboarding-storage";
import { TaskCard } from "@/components/TaskCard";
import { TipBanner } from "@/components/TipBanner";
import { WeekBreakdownPreview } from "@/components/WeekBreakdownPreview";
import { useDistributeWeek } from "@/hooks/useDistributeWeek";
import {
  weekDates,
  todayString,
  formatWeekRangeLabel,
  weekOffsetForDate,
  WEEKDAY_SHORT,
  WEEKDAY_FULL,
  MONTH_GENITIVE,
  weekdayIndex,
} from "@/lib/date";
import { pluralTasks, formatDuration } from "@/lib/format";
import { PRIORITY_DOT_COLORS } from "@/lib/priority";
import { getWeekSummary, saveWeekSummary } from "@/lib/week-summary-storage";
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
  return `${dayLabel} · ${tasks.length} ${pluralTasks(tasks.length)} · ${formatDuration(minutes)}`;
}

export default function WeekPage() {
  const allTasks = useSyncExternalStore(
    subscribeTasks,
    getTasksSnapshot,
    getTasksServerSnapshot,
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(() => !hasSeenTip("week"));
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [summaryRefreshing, setSummaryRefreshing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showFullWeekList, setShowFullWeekList] = useState(false);
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
  const archiveTransitionIds = useSyncExternalStore(
    subscribeArchiveTransition,
    getArchiveTransitionIds,
    getArchiveTransitionIdsServerSnapshot,
  );
  const isVisible = (t: Task) => !isArchived(t) || archiveTransitionIds.includes(t.id);
  const {
    distributing,
    error,
    preview,
    distributeWeek,
    updatePreviewRow,
    confirmPreview,
    cancelPreview,
  } = useDistributeWeek({ allTasks, weekOffset, isVisible });

  function toggleDone(task: Task) {
    const done = task.completedAt !== null;
    if (done) {
      clearJustCompleted(task.id);
    } else {
      markJustCompleted(task.id);
    }
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

  function pickDate(date: string) {
    if (!date) return;
    setWeekOffset(Math.max(0, weekOffsetForDate(date, today)));
    setSelectedDate(date);
  }

  function goToToday() {
    setWeekOffset(0);
    setSelectedDate(null);
  }

  function dismissTip() {
    markTipSeen("week");
    setShowTip(false);
  }

  function handleConfirmPreview() {
    confirmPreview();
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  }

  async function refreshWeekSummary() {
    vibrate(10);
    if (weekSummaryTasks.length === 0) return;
    setSummaryRefreshing(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/week-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: weekSummaryTasks.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            estimatedMinutes: t.estimatedMinutes,
            deadline: t.deadline,
            scheduledDate: t.scheduledDate,
          })),
          today,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        console.error(data.error);
        setSummaryError(AI_ERROR_MESSAGE);
        return;
      }
      saveWeekSummary(
        weekKey,
        weekSummaryTasks.map((t) => t.id),
        data.summary,
      );
    } catch (err) {
      console.error(err);
      setSummaryError(AI_ERROR_MESSAGE);
    } finally {
      setSummaryRefreshing(false);
    }
  }

  const dates = weekDates(weekOffset);
  const today = todayString();
  const visibleTasks = allTasks.filter((t) => !pendingDeleteIds.includes(t.id));
  const unscheduledCount = visibleTasks.filter(
    (t) => t.scheduledDate === null && t.completedAt === null,
  ).length;
  const weekKey = dates[0];
  const weekSummaryTasks = visibleTasks.filter(
    (t) =>
      t.scheduledDate !== null &&
      dates.includes(t.scheduledDate) &&
      isVisible(t) &&
      !t.isExample,
  );
  const storedSummary = getWeekSummary(weekKey);

  if (preview) {
    return (
      <WeekBreakdownPreview
        rows={preview}
        onChangeRow={updatePreviewRow}
        onConfirm={handleConfirmPreview}
        onCancel={cancelPreview}
      />
    );
  }

  const todayTasks = sortByPriority(
    visibleTasks.filter((t) => t.scheduledDate === today && isVisible(t)),
  );

  const weekListTasks = sortByDay(
    visibleTasks.filter(
      (t) =>
        t.scheduledDate !== null &&
        t.scheduledDate !== today &&
        dates.includes(t.scheduledDate) &&
        isVisible(t),
    ),
  );

  const selectedDayTasks = selectedDate
    ? sortByPriority(
        visibleTasks.filter((t) => t.scheduledDate === selectedDate && isVisible(t)),
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

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-3 flex items-center justify-between gap-1">
        <button
          onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
          disabled={weekOffset === 0}
          aria-label="Попередній тиждень"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-neutral-400 disabled:opacity-30 ${TAP_ACTIVE}`}
        >
          ←
        </button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <span
            className={`relative inline-flex items-center rounded-lg px-1 py-1.5 text-sm font-medium text-neutral-300 underline decoration-neutral-600 decoration-dotted underline-offset-4 ${TAP_ACTIVE}`}
          >
            {formatWeekRangeLabel(dates)}
            <input
              type="date"
              value={selectedDate ?? ""}
              min={today}
              onChange={(e) => pickDate(e.target.value)}
              aria-label="Обрати дату"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </span>
          {(weekOffset !== 0 || selectedDate !== null) && (
            <button
              type="button"
              onClick={goToToday}
              className={`shrink-0 rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 ${TAP_ACTIVE}`}
            >
              Сьогодні
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          aria-label="Наступний тиждень"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-neutral-400 ${TAP_ACTIVE}`}
        >
          →
        </button>
      </div>

      <div className="mb-6 grid grid-cols-7 gap-1">
        {dates.map((date) => {
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const dayTasks = visibleTasks.filter(
            (t) => t.scheduledDate === date && t.completedAt === null,
          );
          const count = dayTasks.length;
          const topPriority = dayTasks.reduce<Priority | null>((top, t) => {
            if (top === null || PRIORITY_RANK[t.priority] < PRIORITY_RANK[top]) return t.priority;
            return top;
          }, null);
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
              <span className="flex h-3 items-center justify-center">
                {count === 0 ? null : count >= 4 ? (
                  <span
                    className={`text-[10px] font-semibold ${
                      isSelected ? "text-accent-foreground" : "text-neutral-300"
                    }`}
                  >
                    {count}
                  </span>
                ) : (
                  <span className="flex gap-0.5">
                    {Array.from({ length: count }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1 w-1 rounded-full ${
                          isSelected ? "bg-accent-foreground" : PRIORITY_DOT_COLORS[topPriority as Priority]
                        }`}
                      />
                    ))}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDate ? (
        <div className="mb-6 animate-[fadeInUp_0.2s_ease-out_backwards]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-white">
              {formatDayPanelHeader(selectedDate, selectedDayTasks)}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className={`shrink-0 text-sm text-neutral-500 underline ${TAP_ACTIVE}`}
            >
              До тижня
            </button>
          </div>
          {selectedDayTasks.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="mb-4 text-neutral-400">На цей день нічого не заплановано</p>
              {unscheduledCount === 0 ? (
                <p className="text-sm font-medium text-neutral-400">
                  Всі задачі вже розкладені ✓
                </p>
              ) : (
                <button
                  onClick={distributeWeek}
                  disabled={distributing}
                  className={`rounded-full bg-neutral-800 px-6 py-3 text-base text-neutral-300 disabled:opacity-40 ${TAP_ACTIVE}`}
                >
                  {distributing ? "Розкладаю..." : `Розкласти по днях (${unscheduledCount})`}
                </button>
              )}
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

          {weekSummaryTasks.length > 0 && (
            <div className="mb-6 rounded-2xl bg-card p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 break-words text-sm text-neutral-200">
                  {storedSummary
                    ? storedSummary.summary
                    : `На цей тиждень: ${weekSummaryTasks.length} ${pluralTasks(weekSummaryTasks.length)} · ${formatDuration(
                        weekSummaryTasks.reduce(
                          (sum, t) =>
                            sum + (t.estimatedMinutes && t.estimatedMinutes > 0 ? t.estimatedMinutes : 30),
                          0,
                        ),
                      )}`}
                </p>
                <button
                  onClick={refreshWeekSummary}
                  disabled={summaryRefreshing}
                  aria-label="Оновити резюме тижня"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base text-neutral-400 disabled:opacity-40 ${TAP_ACTIVE}`}
                >
                  {summaryRefreshing ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-500/40 border-t-neutral-300" />
                  ) : (
                    "↻"
                  )}
                </button>
              </div>
              {summaryError && <p className="mb-2 text-xs text-red-400">{summaryError}</p>}
              {weekListTasks.length > 0 && (
                <button
                  onClick={() => setShowFullWeekList((v) => !v)}
                  className={`text-xs font-medium text-accent ${TAP_ACTIVE}`}
                >
                  {showFullWeekList ? "Згорнути список" : "Переглянути всі задачі тижня"}
                </button>
              )}
            </div>
          )}

          {showFullWeekList && weekListTasks.length > 0 && (
            <div className="mb-6 flex flex-col gap-3 animate-[fadeInUp_0.2s_ease-out_backwards]">
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
        <div className="fixed inset-x-4 bottom-20 z-20 flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-lg animate-[fadeInUp_0.2s_ease-out]">
          <span className="text-sm font-medium text-white">Готово! Задачі тепер у Тижні</span>
          <Link
            href="/week"
            onClick={() => setShowSuccessToast(false)}
            className={`ml-3 shrink-0 text-sm font-semibold text-accent ${TAP_TARGET_44} ${TAP_ACTIVE}`}
          >
            Переглянути тиждень
          </Link>
        </div>
      )}
    </main>
  );
}
