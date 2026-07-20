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
import { hasSeenTip, markTipSeen } from "@/lib/onboarding-storage";
import { TaskCard } from "@/components/TaskCard";
import { TipBanner } from "@/components/TipBanner";
import { isArchived } from "@/lib/archive";
import { TAP_ACTIVE, TAP_TARGET_44 } from "@/lib/ui";
import type { Priority, Task } from "@/lib/types";

const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

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

type InboxFilter = "all" | "high" | "medium" | "low" | "unscheduled";

const FILTER_OPTIONS: { value: InboxFilter; label: string }[] = [
  { value: "all", label: "Всі" },
  { value: "high", label: "Високий" },
  { value: "medium", label: "Середній" },
  { value: "low", label: "Низький" },
  { value: "unscheduled", label: "Без дня" },
];

function matchesFilter(task: Task, filter: InboxFilter): boolean {
  if (filter === "all") return true;
  if (filter === "unscheduled") return task.scheduledDate === null;
  return task.priority === filter;
}

export default function InboxPage() {
  const allTasks = useSyncExternalStore(
    subscribeTasks,
    getTasksSnapshot,
    getTasksServerSnapshot,
  );
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [showTip, setShowTip] = useState(() => !hasSeenTip("inbox"));
  const [filter, setFilter] = useState<InboxFilter>("all");
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

  const tasks = allTasks.filter((t) => t.scheduledDate === null && !isArchived(t));

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

  function dismissTip() {
    markTipSeen("inbox");
    setShowTip(false);
  }

  if (tasks.length === 0) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 pb-8 text-center animate-[pageFade_0.15s_ease-out]">
        <h1 className="mb-2 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
          Тут порожньо
        </h1>
        <p className="mb-6 text-neutral-400">
          Занотуй перші думки на вкладці &laquo;Занотувати&raquo; — і задачі
          з&apos;являться тут.
        </p>
        <Link
          href="/"
          className={`mb-3 rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground ${TAP_ACTIVE}`}
        >
          Занотувати
        </Link>
        <Link href="/archive" className={`text-sm text-neutral-500 underline ${TAP_ACTIVE}`}>
          Архів
        </Link>
      </main>
    );
  }

  const visibleTasks = tasks.filter((t) => !pendingDeleteIds.includes(t.id));
  const filteredTasks = visibleTasks.filter((t) => matchesFilter(t, filter));
  const active = sortActive(filteredTasks.filter((t) => t.completedAt === null));
  const done = sortDone(filteredTasks.filter((t) => t.completedAt !== null));
  const filterEmptyState = filter !== "all" && filteredTasks.length === 0;

  return (
    <main className="min-h-dvh px-4 pb-8 pt-6 animate-[pageFade_0.15s_ease-out]">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
          Вхідні
        </h1>
        <Link href="/archive" className={`text-sm text-neutral-500 underline ${TAP_ACTIVE}`}>
          Архів
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${TAP_ACTIVE} ${
              filter === opt.value
                ? "bg-accent text-accent-foreground"
                : "bg-neutral-800 text-neutral-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {showTip && (
        <TipBanner
          text="Це твої Вхідні — всі задачі тут. Тапни задачу, щоб змінити день чи пріоритет. Готове відмічай галочкою 👌"
          onDismiss={dismissTip}
        />
      )}

      {filterEmptyState ? (
        <div className="py-10 text-center">
          <p className="mb-3 text-neutral-400">Нічого не знайшлось.</p>
          <button
            onClick={() => setFilter("all")}
            className={`text-sm font-semibold text-accent underline ${TAP_ACTIVE}`}
          >
            Зняти фільтр?
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {active.map((task, index) => (
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

          {done.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setDoneExpanded((v) => !v)}
                className={`flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm font-medium text-neutral-400 ${TAP_ACTIVE}`}
              >
                <span>Виконано ({done.length})</span>
                <span className={doneExpanded ? "rotate-180" : ""}>⌄</span>
              </button>
              {doneExpanded && (
                <div className="mt-2 flex flex-col gap-4 animate-[fadeInUp_0.2s_ease-out_backwards]">
                  {done.map((task, index) => (
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
    </main>
  );
}
