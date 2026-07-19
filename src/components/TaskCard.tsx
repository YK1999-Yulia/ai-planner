"use client";

import { useState } from "react";
import { PRIORITY_LABELS, PRIORITY_CHIP_STYLES } from "@/lib/priority";
import { formatDeadline } from "@/lib/format";
import { DaySelect } from "@/components/DaySelect";
import type { Priority, Task } from "@/lib/types";

interface TaskCardProps {
  task: Task;
  startTime?: string;
  overdueLabel?: string;
  onToggleDone: (task: Task) => void;
  onDelete: (task: Task) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onScheduleToday?: () => void;
}

export function TaskCard({
  task,
  startTime,
  overdueLabel,
  onToggleDone,
  onDelete,
  onUpdate,
  onScheduleToday,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isDone = task.completedAt !== null;
  const deadlineInfo = task.deadline ? formatDeadline(task.deadline) : null;

  return (
    <div
      className={`rounded-2xl bg-card p-5 animate-[fadeInUp_0.2s_ease-out] ${
        isDone ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleDone(task)}
          aria-label={isDone ? "Позначити невиконаною" : "Позначити виконаною"}
          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
            isDone
              ? "border-accent bg-accent text-accent-foreground animate-[checkPop_0.25s_ease-out]"
              : "border-neutral-600"
          }`}
        >
          {isDone && "✓"}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left"
        >
          <div className="flex items-baseline gap-2">
            {startTime && (
              <span className="text-sm font-medium text-neutral-400">{startTime}</span>
            )}
            <p
              className={`text-base ${
                isDone ? "text-neutral-500 line-through" : "text-white"
              }`}
            >
              {task.title}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_CHIP_STYLES[task.priority]}`}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
            {Boolean(task.estimatedMinutes) && (
              <span className="text-neutral-400">{task.estimatedMinutes} хв</span>
            )}
            {deadlineInfo && (
              <span
                className={deadlineInfo.overdue ? "font-medium text-red-400" : "text-neutral-400"}
              >
                {deadlineInfo.label}
              </span>
            )}
            {overdueLabel && (
              <span className="font-medium text-red-400">{overdueLabel}</span>
            )}
          </div>
        </button>

        <button
          onClick={() => onDelete(task)}
          aria-label="Видалити задачу"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-neutral-500"
        >
          ✕
        </button>
      </div>

      {onScheduleToday && !isDone && (
        <button
          onClick={onScheduleToday}
          className="mt-3 rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200"
        >
          На сьогодні
        </button>
      )}

      {expanded && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <label className="mb-1 block text-xs text-neutral-400">Запланована на</label>
          <DaySelect
            value={task.scheduledDate}
            onChange={(value) => onUpdate(task.id, { scheduledDate: value })}
            className="mb-3 w-full rounded-lg bg-neutral-800 px-2 py-2 text-neutral-200"
          />

          <div className="flex flex-wrap gap-2 text-sm">
            <select
              value={task.priority}
              onChange={(e) => onUpdate(task.id, { priority: e.target.value as Priority })}
              className="rounded-lg bg-neutral-800 px-2 py-2 text-neutral-200"
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={5}
              value={task.estimatedMinutes ?? ""}
              onChange={(e) =>
                onUpdate(task.id, {
                  estimatedMinutes: e.target.value ? Math.max(5, Number(e.target.value)) : null,
                })
              }
              placeholder="хв"
              className="w-20 rounded-lg bg-neutral-800 px-2 py-2 text-neutral-200"
            />

            <input
              type="date"
              value={task.deadline ?? ""}
              onChange={(e) => onUpdate(task.id, { deadline: e.target.value || null })}
              className="rounded-lg bg-neutral-800 px-2 py-2 text-neutral-200"
            />
          </div>
        </div>
      )}
    </div>
  );
}
