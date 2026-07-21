"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  subscribeTasks,
  getTasksSnapshot,
  getTasksServerSnapshot,
  updateTaskById,
} from "@/lib/tasks-store";
import { loadSettings, type DaySettings } from "@/lib/settings-storage";
import {
  hasGeneratedPlan,
  markPlanGenerated,
  getGeneratedPlanTaskIds,
} from "@/lib/today-plan-storage";
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
import { TaskCard } from "@/components/TaskCard";
import { EmptyState } from "@/components/EmptyState";
import { todayString, addDays } from "@/lib/date";
import { formatDaysUntil, pluralTasks, formatDuration, formatOverdueCount } from "@/lib/format";
import { isArchived } from "@/lib/archive";
import { vibrate } from "@/lib/haptics";
import { TAP_ACTIVE, TAP_TARGET_44 } from "@/lib/ui";
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
  const [overdueExpanded, setOverdueExpanded] = useState(true);
  const [confirmingBulkMove, setConfirmingBulkMove] = useState(false);
  const [showPlanReadyToast, setShowPlanReadyToast] = useState(false);
  const overdueSectionRef = useRef<HTMLDivElement>(null);
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

  function scrollToOverdue() {
    overdueSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function moveAllOverdueToToday() {
    vibrate(10);
    for (const task of overdueTasks) {
      update(task.id, { scheduledDate: today });
    }
    setConfirmingBulkMove(false);
  }

  async function generatePlan() {
    vibrate(10);
    const today = todayString();
    const candidates = allTasks.filter((t) => t.scheduledDate === today && !isArchived(t));

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
        updateTaskById(id, { position: index });
      });

      markPlanGenerated(today, data.orderedTaskIds as string[]);
      setShowPlanReadyToast(true);
      setTimeout(() => setShowPlanReadyToast(false), 3000);
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

  const todayAllForCount = visibleTasks.filter((t) => t.scheduledDate === today);
  const totalTodayCount = todayAllForCount.length;
  const doneCount = todayAllForCount.filter((t) => t.completedAt !== null).length;

  const todayTasks = todayAllForCount
    .filter((t) => !isArchived(t) || archiveTransitionIds.includes(t.id))
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
  const progressPercent =
    totalTodayCount > 0 ? Math.round((doneCount / totalTodayCount) * 100) : 0;
  const allDone = totalTodayCount > 0 && doneCount === totalTodayCount;
  const planGenerated = hasGeneratedPlan(today);
  const planTaskIds = getGeneratedPlanTaskIds(today);
  const currentTodayIds = todayAllForCount.map((t) => t.id).sort();
  const planIsStale =
    planGenerated &&
    planTaskIds !== null &&
    (planTaskIds.length !== currentTodayIds.length ||
      planTaskIds.some((id, i) => id !== currentTodayIds[i]));
  const inboxHasTasks = allTasks.some(
    (t) => t.scheduledDate === null && t.completedAt === null,
  );
  const hasProposals = overdueTasks.length > 0 || horizonTasks.length > 0;

  const activeTodayCount = todayTasks.filter((t) => t.completedAt === null).length;
  const activeTodayMinutes = todayTasks
    .filter((t) => t.completedAt === null)
    .reduce((sum, t) => sum + (t.estimatedMinutes && t.estimatedMinutes > 0 ? t.estimatedMinutes : 30), 0);
  const todaySubtitle =
    totalTodayCount === 0
      ? null
      : allDone
        ? "Все зроблено. Ти молодець ✨"
        : `${activeTodayCount} ${pluralTasks(activeTodayCount)} на сьогодні · ${formatDuration(activeTodayMinutes)}`;

  const overdueSection = overdueTasks.length > 0 && (
    <div ref={overdueSectionRef} className="mt-6 rounded-2xl bg-red-500/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => setOverdueExpanded((v) => !v)}
          className={`flex items-center gap-1.5 font-[family-name:var(--font-heading)] text-lg font-bold text-red-400 ${TAP_ACTIVE}`}
        >
          <span aria-hidden>⚠️</span>
          <span>Прострочене ({overdueTasks.length})</span>
          <span className={overdueExpanded ? "rotate-180" : ""}>⌄</span>
        </button>
        {confirmingBulkMove ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-red-300">
              Перенести {overdueTasks.length} {pluralTasks(overdueTasks.length)}?
            </span>
            <button
              onClick={moveAllOverdueToToday}
              className={`rounded-full bg-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-200 ${TAP_ACTIVE}`}
            >
              Так
            </button>
            <button
              onClick={() => setConfirmingBulkMove(false)}
              className={`rounded-full px-2 py-1.5 text-xs font-medium text-neutral-400 ${TAP_ACTIVE}`}
            >
              Скасувати
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingBulkMove(true)}
            className={`shrink-0 rounded-full bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 ${TAP_ACTIVE}`}
          >
            Перенести все на сьогодні
          </button>
        )}
      </div>
      {overdueExpanded && (
        <div className="mt-3 flex flex-col gap-4 animate-[fadeInUp_0.2s_ease-out_backwards]">
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
              scheduleLabel="Перенести на сьогодні?"
            />
          ))}
        </div>
      )}
    </div>
  );

  const horizonHeading = allDone ? "Можна зробити заздалегідь" : "На горизонті";

  const horizonSection = horizonTasks.length > 0 && (
    <div className="mt-6">
      <h2 className="mb-2 font-[family-name:var(--font-heading)] text-lg font-bold text-neutral-300">
        {horizonHeading}
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

  if (totalTodayCount === 0) {
    todayContent = (
      <EmptyState
        icon="☀️"
        text="На сьогодні задач поки немає"
        actionLabel="Записати першу задачу на сьогодні"
        actionHref="/"
        secondaryLabel={inboxHasTasks ? "Взяти з Вхідних" : undefined}
        secondaryHref={inboxHasTasks ? "/inbox" : undefined}
      />
    );
  } else if (allDone) {
    todayContent = (
      <>
        <div className="mb-4">
          <p className="mb-2 text-sm text-neutral-300">
            {doneCount} з {totalTodayCount} виконано
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full w-full rounded-full bg-accent transition-all duration-300" />
          </div>
        </div>

        <div className="flex flex-col items-center py-10 text-center">
          <p className="mb-2 text-xl font-semibold text-white">
            На сьогодні все виконано! 🎉
          </p>
          <p className={hasProposals ? "text-neutral-400" : "mb-6 text-neutral-400"}>
            Ти молодець. Відпочинь або заплануй щось на завтра
          </p>
          {!hasProposals && (
            <Link
              href="/week"
              className={`rounded-full bg-neutral-800 px-6 py-3 text-base text-neutral-300 ${TAP_ACTIVE}`}
            >
              Заглянути у Тиждень
            </Link>
          )}
        </div>

        {hasProposals && (
          <>
            <p className="mb-4 text-sm text-neutral-400">
              Є час і настрій? Можна взяти щось наперед або закрити борги:
            </p>
            {horizonSection}
            {overdueSection}
            <Link
              href="/week"
              className={`mt-6 block rounded-full bg-neutral-800 px-6 py-3 text-center text-base text-neutral-300 ${TAP_ACTIVE}`}
            >
              Заглянути у Тиждень
            </Link>
          </>
        )}
      </>
    );
  } else {
    todayContent = (
      <>
        <div className="mb-4">
          <p className="mb-2 text-sm text-neutral-300">
            {doneCount} з {totalTodayCount} виконано
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
            Сформуй план — я розставлю задачі по часу
          </p>
        )}

        {planGenerated && planIsStale && (
          <p className="mb-3 rounded-xl bg-accent/15 px-4 py-3 text-sm font-medium text-accent">
            План застарів. Сформувати заново?
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
              startTime={planGenerated && !planIsStale ? start : undefined}
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
      {todaySubtitle && <p className="mb-2 text-sm text-neutral-400">{todaySubtitle}</p>}
      {!todaySubtitle && <div className="mb-2" />}

      {overdueTasks.length > 0 && (
        <button
          onClick={scrollToOverdue}
          className={`mb-4 inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 ${TAP_ACTIVE}`}
        >
          <span aria-hidden>⚠️</span>
          <span>{formatOverdueCount(overdueTasks.length)}</span>
        </button>
      )}

      {todayContent}
      {!allDone && horizonSection}
      {!allDone && overdueSection}

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

      {showPlanReadyToast && (
        <div className="fixed inset-x-4 bottom-20 z-20 rounded-2xl bg-card px-4 py-3 text-center text-sm font-medium text-white shadow-lg animate-[fadeInUp_0.2s_ease-out]">
          План готовий. Гарного дня! ✨
        </div>
      )}
    </main>
  );
}
