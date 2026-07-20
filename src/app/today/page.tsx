"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  subscribeTasks,
  getTasksSnapshot,
  getTasksServerSnapshot,
  updateTaskById,
} from "@/lib/tasks-store";
import { loadSettings, type DaySettings } from "@/lib/settings-storage";
import { hasGeneratedPlan, markPlanGenerated } from "@/lib/today-plan-storage";
import {
  subscribeDelete,
  getPendingDelete,
  getPendingDeleteServerSnapshot,
  getPendingDeleteIds,
  getPendingDeleteIdsServerSnapshot,
  scheduleDelete,
  undoPendingDelete,
} from "@/lib/delete-store";
import { TaskCard } from "@/components/TaskCard";
import { todayString, addDays } from "@/lib/date";
import { formatDaysUntil, pluralTasks, formatHoursApprox } from "@/lib/format";
import { isArchived } from "@/lib/archive";
import { vibrate } from "@/lib/haptics";
import { TAP_ACTIVE } from "@/lib/ui";
import { AI_ERROR_MESSAGE } from "@/lib/errors";
import type { Task } from "@/lib/types";

const HORIZON_DAYS = 7;

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hh = Math.floor(wrapped / 60)
    .toString()
    .padStart(2, "0");
  const mm = (wrapped % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function TodayPage() {
  const allTasks = useSyncExternalStore(
    subscribeTasks,
    getTasksSnapshot,
    getTasksServerSnapshot,
  );
  const [settings] = useState<DaySettings>(() => loadSettings());
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function generatePlan() {
    vibrate(10);
    const today = todayString();
    const todayAll = allTasks.filter((t) => t.scheduledDate === today && !isArchived(t));
    const overdueUndone = allTasks.filter(
      (t) => t.scheduledDate !== null && t.scheduledDate < today && t.completedAt === null,
    );
    const candidates = [...overdueUndone, ...todayAll];
    const overdueIds = new Set(overdueUndone.map((t) => t.id));

    if (candidates.length === 0) {
      setError("На сьогодні ще немає запланованих задач.");
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/plan-today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: candidates.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            estimatedMinutes: t.estimatedMinutes,
            deadline: t.deadline,
            overdue: overdueIds.has(t.id),
          })),
          dayStart: settings.dayStart,
          dayEnd: settings.dayEnd,
          today,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        console.error(data.error);
        setError(AI_ERROR_MESSAGE);
        return;
      }

      (data.orderedTaskIds as string[]).forEach((id, index) => {
        updateTaskById(id, {
          position: index,
          ...(overdueIds.has(id) ? { scheduledDate: today } : {}),
        });
      });

      markPlanGenerated(today);
    } catch (err) {
      console.error(err);
      setError(AI_ERROR_MESSAGE);
    } finally {
      setGenerating(false);
    }
  }

  const today = todayString();
  const horizonLimit = addDays(today, HORIZON_DAYS);
  const visibleTasks = allTasks.filter((t) => !pendingDeleteIds.includes(t.id));

  const todayTasks = visibleTasks
    .filter((t) => t.scheduledDate === today && !isArchived(t))
    .sort((a, b) => a.position - b.position);

  const overdueTasks = visibleTasks
    .filter((t) => t.scheduledDate !== null && t.scheduledDate < today && t.completedAt === null)
    .sort((a, b) => (a.scheduledDate as string).localeCompare(b.scheduledDate as string));

  const horizonTasks = visibleTasks
    .filter(
      (t) =>
        t.completedAt === null &&
        t.deadline !== null &&
        t.deadline >= today &&
        t.deadline <= horizonLimit &&
        t.scheduledDate !== today &&
        !(t.scheduledDate !== null && t.scheduledDate < today),
    )
    .sort((a, b) => (a.deadline as string).localeCompare(b.deadline as string));

  let cursor = settings.dayStart;
  const withTimes = todayTasks.map((t) => {
    const start = cursor;
    cursor = addMinutes(cursor, t.estimatedMinutes && t.estimatedMinutes > 0 ? t.estimatedMinutes : 30);
    return { task: t, start };
  });

  const overflow = cursor > settings.dayEnd;
  const doneCount = todayTasks.filter((t) => t.completedAt !== null).length;
  const progressPercent =
    todayTasks.length > 0 ? Math.round((doneCount / todayTasks.length) * 100) : 0;
  const allDone = todayTasks.length > 0 && doneCount === todayTasks.length;
  const planGenerated = hasGeneratedPlan(today);
  const inboxHasTasks = allTasks.some(
    (t) => t.scheduledDate === null && t.completedAt === null,
  );
  const showSectionLabels = overdueTasks.length > 0 || horizonTasks.length > 0;

  const activeTodayCount = todayTasks.filter((t) => t.completedAt === null).length;
  const activeTodayMinutes = todayTasks
    .filter((t) => t.completedAt === null)
    .reduce((sum, t) => sum + (t.estimatedMinutes && t.estimatedMinutes > 0 ? t.estimatedMinutes : 30), 0);
  const todaySubtitle =
    todayTasks.length === 0
      ? null
      : allDone
        ? "Все зроблено. Ти молодець ✨"
        : `${activeTodayCount} ${pluralTasks(activeTodayCount)} на сьогодні · ${formatHoursApprox(activeTodayMinutes)}`;

  const overdueSection = overdueTasks.length > 0 && (
    <div className="mb-6">
      <h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg font-bold text-red-400">
        Прострочене
      </h2>
      <div className="flex flex-col gap-4">
        {overdueTasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            overdueLabel={formatDaysUntil(task.scheduledDate as string).label}
            onToggleDone={toggleDone}
            onDelete={remove}
            onUpdate={update}
            onScheduleToday={() => update(task.id, { scheduledDate: today })}
          />
        ))}
      </div>
    </div>
  );

  const horizonSection = horizonTasks.length > 0 && (
    <div className="mt-6">
      <h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg font-bold text-neutral-300">
        На горизонті
      </h2>
      <div className="flex flex-col gap-3">
        {horizonTasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            compact
            onToggleDone={toggleDone}
            onDelete={remove}
            onUpdate={update}
            onScheduleToday={() => update(task.id, { scheduledDate: today })}
          />
        ))}
      </div>
    </div>
  );

  let todayContent: React.ReactNode;

  if (todayTasks.length === 0) {
    todayContent = (
      <div className="flex flex-col items-center py-10 text-center">
        <p className="mb-6 text-lg text-neutral-300">На сьогодні задач поки немає</p>
        <Link
          href="/"
          className={`mb-3 w-full max-w-xs rounded-full bg-accent py-4 text-base font-semibold text-accent-foreground ${TAP_ACTIVE}`}
        >
          Записати першу задачу на сьогодні
        </Link>
        {inboxHasTasks && (
          <Link
            href="/inbox"
            className={`w-full max-w-xs rounded-full bg-neutral-800 py-3 text-base text-neutral-300 ${TAP_ACTIVE}`}
          >
            Взяти з Вхідних
          </Link>
        )}
      </div>
    );
  } else if (allDone) {
    todayContent = (
      <>
        <div className="mb-4">
          <p className="mb-2 text-sm text-neutral-300">
            {doneCount} з {todayTasks.length} виконано
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full w-full rounded-full bg-accent transition-all duration-300" />
          </div>
        </div>

        <div className="flex flex-col items-center py-10 text-center">
          <p className="mb-2 text-xl font-semibold text-white">
            На сьогодні все виконано! 🎉
          </p>
          <p className="mb-6 text-neutral-400">
            Ти молодець. Відпочинь або заплануй щось на завтра
          </p>
          <Link
            href="/week"
            className={`rounded-full bg-neutral-800 px-6 py-3 text-base text-neutral-300 ${TAP_ACTIVE}`}
          >
            Заглянути у Тиждень
          </Link>
        </div>
      </>
    );
  } else {
    todayContent = (
      <>
        <div className="mb-4">
          <p className="mb-2 text-sm text-neutral-300">
            {doneCount} з {todayTasks.length} виконано
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <Link
          href="/settings"
          className={`mb-4 inline-block text-xs text-neutral-500 underline ${TAP_ACTIVE}`}
        >
          Робочі години: {settings.dayStart}–{settings.dayEnd}
        </Link>

        {!planGenerated && (
          <p className="mb-3 rounded-xl bg-accent/15 px-4 py-3 text-sm font-medium text-accent">
            План ще не сформований — тисни кнопку нижче, щоб розставити задачі за часом
          </p>
        )}

        <button
          onClick={generatePlan}
          disabled={generating}
          className={`mb-4 w-full rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground disabled:opacity-40 ${TAP_ACTIVE}`}
        >
          {generating ? "Складаю план..." : "Сформувати план на сьогодні"}
        </button>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {overflow && (
          <p className="mb-4 text-sm text-amber-400">
            План виходить за межі робочого дня — розглянь можливість прибрати щось.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {withTimes.map(({ task, start }, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              startTime={start}
              onToggleDone={toggleDone}
              onDelete={remove}
              onUpdate={update}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <main className="min-h-dvh px-4 pb-8 pt-6 animate-[pageFade_0.15s_ease-out]">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
        Сьогодні
      </h1>
      {todaySubtitle && <p className="mb-4 text-sm text-neutral-400">{todaySubtitle}</p>}
      {!todaySubtitle && <div className="mb-4" />}

      {overdueSection}

      {showSectionLabels && (
        <h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg font-bold text-white">
          Сьогодні
        </h2>
      )}

      {todayContent}
      {horizonSection}

      {pendingDelete && (
        <div className="fixed inset-x-4 bottom-20 z-20 flex items-center justify-between rounded-2xl bg-card px-4 py-3 shadow-lg">
          <span className="truncate text-sm text-neutral-300">
            Видалено &middot; {pendingDelete.title}
          </span>
          <button onClick={undoDelete} className={`ml-3 shrink-0 text-sm font-semibold text-accent ${TAP_ACTIVE}`}>
            Повернути
          </button>
        </div>
      )}
    </main>
  );
}
