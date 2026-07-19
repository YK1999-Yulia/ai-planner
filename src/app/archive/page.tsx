"use client";

import { useSyncExternalStore } from "react";
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
  scheduleDelete,
  undoPendingDelete,
} from "@/lib/delete-store";
import { isArchived, completedDateString, formatArchiveGroupLabel } from "@/lib/archive";
import type { Task } from "@/lib/types";

function ArchiveCard({
  task,
  onRestore,
  onDelete,
}: {
  task: Task;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4">
      <div className="flex-1">
        <p className="text-base text-neutral-500 line-through">{task.title}</p>
        <p className="mt-1 text-xs text-neutral-500">
          {formatArchiveGroupLabel(completedDateString(task) as string)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onRestore}
          className="rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200"
        >
          Повернути
        </button>
        <button
          onClick={onDelete}
          aria-label="Видалити назавжди"
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-neutral-500"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function ArchivePage() {
  const allTasks = useSyncExternalStore(
    subscribeTasks,
    getTasksSnapshot,
    getTasksServerSnapshot,
  );
  const pendingDelete = useSyncExternalStore(
    subscribeDelete,
    getPendingDelete,
    getPendingDeleteServerSnapshot,
  );

  function restore(task: Task) {
    updateTaskById(task.id, { completedAt: null, scheduledDate: null });
  }

  function remove(task: Task) {
    scheduleDelete(task);
  }

  function undoDelete() {
    undoPendingDelete();
  }

  const archived = allTasks.filter((t) => isArchived(t) && t.id !== pendingDelete?.id);

  const groups = new Map<string, Task[]>();
  for (const task of archived) {
    const date = completedDateString(task) as string;
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(task);
  }
  const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));
  for (const list of groups.values()) {
    list.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  }

  return (
    <main className="min-h-dvh px-4 pb-8 pt-6">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/inbox" aria-label="Назад до Вхідних" className="text-xl text-neutral-400">
          ←
        </Link>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
          Архів
        </h1>
      </div>

      {archived.length === 0 ? (
        <p className="py-10 text-center text-neutral-400">
          Тут з&apos;являться виконані задачі. Перша ще попереду 💪
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h2 className="mb-2 text-sm font-semibold text-neutral-400">
                {formatArchiveGroupLabel(date)}
              </h2>
              <div className="flex flex-col gap-3">
                {(groups.get(date) as Task[]).map((task) => (
                  <ArchiveCard
                    key={task.id}
                    task={task}
                    onRestore={() => restore(task)}
                    onDelete={() => remove(task)}
                  />
                ))}
              </div>
            </div>
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
