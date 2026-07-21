"use client";

import { useState } from "react";
import { PRIORITY_LABELS, PRIORITY_CHIP_STYLES, PRIORITY_STRIPE_COLORS } from "@/lib/priority";
import { formatDaysUntil, formatDuration } from "@/lib/format";
import { vibrate } from "@/lib/haptics";
import { TAP_ACTIVE } from "@/lib/ui";
import { DaySelect } from "@/components/DaySelect";
import { DeadlineSelect } from "@/components/DeadlineSelect";
import { DurationSelect } from "@/components/DurationSelect";
import type { Priority, Task } from "@/lib/types";

const STAGGER_MS = 35;
const STAGGER_CAP = 12;

interface TaskCardProps {
  task: Task;
  index?: number;
  startTime?: string;
  dayLabel?: string;
  overdueLabel?: string;
  compact?: boolean;
  onToggleDone: (task: Task) => void;
  onDelete: (task: Task) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onScheduleToday?: () => void;
  scheduleLabel?: string;
}

export function TaskCard({
  task,
  index = 0,
  startTime,
  dayLabel,
  overdueLabel,
  compact,
  onToggleDone,
  onDelete,
  onUpdate,
  onScheduleToday,
  scheduleLabel = "На сьогодні",
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isDone = task.completedAt !== null;
  const deadlineInfo = task.deadline ? formatDaysUntil(task.deadline) : null;
  const isOverdue = Boolean(overdueLabel) || deadlineInfo?.tone === "overdue";
  const stripeColor = isOverdue ? "border-l-red-500" : PRIORITY_STRIPE_COLORS[task.priority];
  const entranceAnimation = isDone
    ? "animate-[cardBounce_0.3s_ease-out]"
    : "animate-[fadeInUp_0.2s_ease-out_backwards]";

  function handleToggleDone() {
    vibrate(10);
    onToggleDone(task);
  }

  return (
    <div
      style={{ animationDelay: `${Math.min(index, STAGGER_CAP) * STAGGER_MS}ms` }}
      className={`rounded-2xl border-l-4 bg-card ${entranceAnimation} ${stripeColor} ${
        compact ? "p-3" : "p-5"
      } ${isDone ? "opacity-50" : compact ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={handleToggleDone}
          aria-label={isDone ? "Позначити невиконаною" : "Позначити виконаною"}
          className={`-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center ${TAP_ACTIVE}`}
        >
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
              isDone
                ? "border-accent bg-accent text-accent-foreground animate-[checkPop_0.2s_ease-out]"
                : "border-neutral-600"
            }`}
          >
            {isDone && "✓"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`min-w-0 flex-1 text-left ${TAP_ACTIVE}`}
        >
          <div className="flex items-baseline gap-2">
            {(startTime || dayLabel) && (
              <span className="text-sm font-medium text-neutral-400">
                {startTime ?? dayLabel}
              </span>
            )}
            <p
              className={`min-w-0 break-words ${compact ? "text-sm" : "text-base"} ${
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
            {!isDone && task.scheduledDate === null && (
              <span className="rounded-full bg-neutral-800 px-2 py-0.5 font-medium text-neutral-500">
                без дня
              </span>
            )}
            {Boolean(task.estimatedMinutes) && (
              <span className="text-neutral-400">{formatDuration(task.estimatedMinutes as number)}</span>
            )}
            {deadlineInfo && (
              <span
                className={
                  deadlineInfo.tone === "overdue"
                    ? "font-medium text-red-400"
                    : deadlineInfo.tone === "today"
                      ? "font-medium text-accent"
                      : "text-neutral-400"
                }
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
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-neutral-500 ${TAP_ACTIVE}`}
        >
          ✕
        </button>
      </div>

      {onScheduleToday && !isDone && (
        <button
          onClick={onScheduleToday}
          className={`mt-3 rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-normal text-neutral-400 ${TAP_ACTIVE}`}
        >
          {scheduleLabel}
        </button>
      )}

      {expanded && (
        <div className="mt-4 border-t border-white/10 pt-4 animate-[fadeInUp_0.2s_ease-out_backwards]">
          <label className="mb-1 block text-xs text-neutral-500">Запланована на</label>
          <DaySelect
            value={task.scheduledDate}
            onChange={(value) => onUpdate(task.id, { scheduledDate: value })}
            className="mb-3 w-full"
          />

          <label className="mb-1 block text-xs text-neutral-500">Дедлайн</label>
          <DeadlineSelect
            value={task.deadline}
            onChange={(value) => onUpdate(task.id, { deadline: value })}
            className="mb-3 w-full"
          />

          <select
            value={task.priority}
            onChange={(e) => onUpdate(task.id, { priority: e.target.value as Priority })}
            className="mb-3 rounded-lg bg-neutral-800 px-2 py-2 text-sm text-neutral-200"
          >
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label className="mb-1 block text-xs text-neutral-500">Тривалість</label>
          <DurationSelect
            value={task.estimatedMinutes}
            onChange={(minutes) => onUpdate(task.id, { estimatedMinutes: minutes })}
          />
        </div>
      )}
    </div>
  );
}
