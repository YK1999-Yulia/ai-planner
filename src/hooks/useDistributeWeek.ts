"use client";

import { useState } from "react";
import { updateTaskById } from "@/lib/tasks-store";
import { weekDates, todayString } from "@/lib/date";
import { saveWeekSummary } from "@/lib/week-summary-storage";
import { vibrate } from "@/lib/haptics";
import { AI_ERROR_MESSAGE } from "@/lib/errors";
import type { Task } from "@/lib/types";

export interface PreviewRow {
  id: string;
  title: string;
  scheduledDate: string;
}

export function useDistributeWeek(params: {
  allTasks: Task[];
  weekOffset: number;
  isVisible: (t: Task) => boolean;
}) {
  const { allTasks, weekOffset, isVisible } = params;
  const [distributing, setDistributing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [pendingSummary, setPendingSummary] = useState<string | null>(null);

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
      setPendingSummary(typeof data.weekSummary === "string" ? data.weekSummary : null);
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
    const dates = weekDates(weekOffset);
    const weekKey = dates[0];
    for (const row of preview) {
      updateTaskById(row.id, { scheduledDate: row.scheduledDate });
    }
    if (pendingSummary) {
      const appliedIds = new Set(preview.map((r) => r.id));
      const weekSummaryTasks = allTasks.filter(
        (t) =>
          t.scheduledDate !== null &&
          dates.includes(t.scheduledDate) &&
          isVisible(t) &&
          !t.isExample,
      );
      const finalTaskIds = [
        ...weekSummaryTasks.filter((t) => !appliedIds.has(t.id)).map((t) => t.id),
        ...preview.map((r) => r.id),
      ];
      saveWeekSummary(weekKey, finalTaskIds, pendingSummary);
    }
    setPreview(null);
    setPendingSummary(null);
  }

  function cancelPreview() {
    setPreview(null);
    setPendingSummary(null);
  }

  return {
    distributing,
    error,
    preview,
    distributeWeek,
    updatePreviewRow,
    confirmPreview,
    cancelPreview,
  };
}
