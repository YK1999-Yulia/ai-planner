"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadTasks, updateTask } from "@/lib/tasks-storage";
import { loadSettings, saveSettings, type DaySettings } from "@/lib/settings-storage";
import { PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/priority";
import { formatDeadline } from "@/lib/format";
import type { Task } from "@/lib/types";

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  const [allTasks, setAllTasks] = useState<Task[] | null>(null);
  const [settings, setSettings] = useState<DaySettings | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAllTasks(loadTasks());
    setSettings(loadSettings());
  }, []);

  function refresh() {
    setAllTasks(loadTasks());
  }

  function updateSetting(patch: Partial<DaySettings>) {
    setSettings((prev) => {
      const next = { ...(prev as DaySettings), ...patch };
      saveSettings(next);
      return next;
    });
  }

  async function generatePlan() {
    if (!settings) return;
    const inboxTasks = (allTasks ?? []).filter(
      (t) => t.status === "inbox" && t.completedAt === null,
    );

    if (inboxTasks.length === 0) {
      setError("У Вхідних немає задач, з яких можна скласти план.");
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/plan-today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: inboxTasks.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            estimatedMinutes: t.estimatedMinutes,
            deadline: t.deadline,
          })),
          dayStart: settings.dayStart,
          dayEnd: settings.dayEnd,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Не вдалося скласти план");
        return;
      }
      if (data.orderedTaskIds.length === 0) {
        setError("AI не зміг підібрати задачі під робочі години. Спробуй змінити години або додати менші задачі.");
        return;
      }

      const today = todayString();
      const existingToday = loadTasks().filter(
        (t) => t.status === "today" && t.scheduledDate === today,
      );
      const startPosition = existingToday.length;

      (data.orderedTaskIds as string[]).forEach((id, index) => {
        updateTask(id, {
          status: "today",
          scheduledDate: today,
          position: startPosition + index,
        });
      });

      refresh();
    } catch {
      setError("Не вдалося зв'язатися з сервером");
    } finally {
      setGenerating(false);
    }
  }

  function toggleDone(task: Task) {
    const done = task.completedAt !== null;
    updateTask(task.id, { completedAt: done ? null : new Date().toISOString() });
    refresh();
  }

  if (allTasks === null || settings === null) {
    return null;
  }

  const today = todayString();
  const todayTasks = allTasks
    .filter((t) => t.status === "today" && t.scheduledDate === today)
    .sort((a, b) => a.position - b.position);

  let cursor = settings.dayStart;
  const withTimes = todayTasks.map((t) => {
    const start = cursor;
    cursor = addMinutes(cursor, t.estimatedMinutes ?? 30);
    return { task: t, start };
  });

  const overflow = cursor > settings.dayEnd;
  const doneCount = todayTasks.filter((t) => t.completedAt !== null).length;
  const progressPercent =
    todayTasks.length > 0 ? Math.round((doneCount / todayTasks.length) * 100) : 0;

  return (
    <main className="min-h-dvh px-4 pb-8 pt-6">
      <h1 className="mb-4 text-2xl font-semibold text-neutral-100">Сьогодні</h1>

      {todayTasks.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-sm text-neutral-300">
            {doneCount} з {todayTasks.length} виконано
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-neutral-100 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-neutral-500">Початок дня</label>
          <input
            type="time"
            value={settings.dayStart}
            onChange={(e) => updateSetting({ dayStart: e.target.value })}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-2 text-neutral-200"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-neutral-500">Кінець дня</label>
          <input
            type="time"
            value={settings.dayEnd}
            onChange={(e) => updateSetting({ dayEnd: e.target.value })}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-2 text-neutral-200"
          />
        </div>
      </div>

      <button
        onClick={generatePlan}
        disabled={generating}
        className="mb-4 w-full rounded-2xl bg-neutral-100 py-4 text-lg font-semibold text-neutral-950 disabled:opacity-40"
      >
        {generating ? "Складаю план..." : "Сформувати план на сьогодні"}
      </button>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {overflow && (
        <p className="mb-4 text-sm text-amber-400">
          План виходить за межі робочого дня — розглянь можливість прибрати щось.
        </p>
      )}

      {todayTasks.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <p className="mb-6 text-neutral-400">
            Натисни кнопку вище — AI обере задачі з Вхідних і розставить їх у
            плані на сьогодні.
          </p>
          <Link
            href="/inbox"
            className="rounded-2xl border border-neutral-700 px-6 py-3 text-base text-neutral-300"
          >
            Переглянути Вхідні
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {withTimes.map(({ task, start }) => {
            const done = task.completedAt !== null;
            const deadlineInfo = task.deadline ? formatDeadline(task.deadline) : null;
            return (
              <div
                key={task.id}
                className={`flex items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 ${
                  done ? "opacity-50" : ""
                }`}
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
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-neutral-400">
                      {start}
                    </span>
                    <p
                      className={`text-base ${
                        done ? "text-neutral-500 line-through" : "text-neutral-100"
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
                    <span className={PRIORITY_COLORS[task.priority]}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    {task.estimatedMinutes && <span>{task.estimatedMinutes} хв</span>}
                    {deadlineInfo && (
                      <span
                        className={
                          deadlineInfo.overdue ? "font-medium text-red-400" : undefined
                        }
                      >
                        {deadlineInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
