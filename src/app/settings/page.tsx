"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getUserName, setUserName } from "@/lib/profile-storage";
import { loadSettings, saveSettings, type DaySettings } from "@/lib/settings-storage";
import { subscribeTasks, getTasksSnapshot, getTasksServerSnapshot, deleteTasksByIds } from "@/lib/tasks-store";
import { TAP_ACTIVE } from "@/lib/ui";

export default function SettingsPage() {
  const [name, setName] = useState(() => getUserName());
  const [settings, setSettings] = useState<DaySettings>(() => loadSettings());
  const allTasks = useSyncExternalStore(
    subscribeTasks,
    getTasksSnapshot,
    getTasksServerSnapshot,
  );

  const exampleIds = allTasks.filter((t) => t.isExample).map((t) => t.id);

  function updateName(value: string) {
    setName(value);
    setUserName(value);
  }

  function updateSetting(patch: Partial<DaySettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }

  function removeExamples() {
    deleteTasksByIds(exampleIds);
  }

  return (
    <main className="min-h-dvh px-4 pb-8 pt-6 animate-[pageFade_0.15s_ease-out]">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/" aria-label="Назад" className={`text-xl text-neutral-400 ${TAP_ACTIVE}`}>
          ←
        </Link>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
          Налаштування
        </h1>
      </div>

      <div className="mb-4 rounded-2xl bg-card p-5">
        <label className="mb-1 block text-xs text-neutral-400">Ім&apos;я</label>
        <input
          value={name}
          onChange={(e) => updateName(e.target.value)}
          placeholder="Як тебе звати?"
          className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-white outline-none placeholder:text-neutral-500"
        />
      </div>

      <div className="mb-4 flex items-center gap-4 rounded-2xl bg-card p-5">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-neutral-400">Початок дня</label>
          <input
            type="time"
            value={settings.dayStart}
            onChange={(e) => updateSetting({ dayStart: e.target.value })}
            className="w-full rounded-lg bg-neutral-800 px-2 py-2 text-neutral-200"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-neutral-400">Кінець дня</label>
          <input
            type="time"
            value={settings.dayEnd}
            onChange={(e) => updateSetting({ dayEnd: e.target.value })}
            className="w-full rounded-lg bg-neutral-800 px-2 py-2 text-neutral-200"
          />
        </div>
      </div>

      {exampleIds.length > 0 && (
        <button
          onClick={removeExamples}
          className={`w-full rounded-full bg-neutral-800 py-3 text-base text-neutral-300 ${TAP_ACTIVE}`}
        >
          Прибрати приклади
        </button>
      )}
    </main>
  );
}
