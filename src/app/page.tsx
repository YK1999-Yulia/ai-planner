"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addTasks, getTasksSnapshot } from "@/lib/tasks-store";
import { PRIORITY_LABELS } from "@/lib/priority";
import { hasSeenWelcome, markWelcomeSeen, hasSeenTip, markTipSeen } from "@/lib/onboarding-storage";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { DaySelect } from "@/components/DaySelect";
import type { ParsedTaskDraft, Priority, Task } from "@/lib/types";

const EXAMPLE_TEXT =
  "Купити молоко і хліб, подзвонити мамі до вечора, доробити презентацію для клієнта до п'ятниці, записатись до лікаря";

export default function CapturePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<ParsedTaskDraft[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);
  const [showPreviewTip, setShowPreviewTip] = useState(false);

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("welcome") === "1";
    const isNewUser = !hasSeenWelcome() && getTasksSnapshot().length === 0;
    setWelcomeSeen(!(forced || isNewUser));
  }, []);

  async function parse(inputText: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Не вдалося розібрати текст");
        return;
      }
      if (data.tasks.length === 0) {
        setError(
          "Не вдалось знайти жодної задачі в тексті. Спробуй сформулювати конкретніше.",
        );
        return;
      }
      setDrafts(data.tasks);
      setShowPreviewTip(!hasSeenTip("preview"));
    } catch {
      setError("Не вдалося зв'язатися з сервером");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    if (!text.trim() || loading) return;
    parse(text);
  }

  function handleTryExample() {
    setText(EXAMPLE_TEXT);
    parse(EXAMPLE_TEXT);
  }

  function updateDraft(index: number, patch: Partial<ParsedTaskDraft>) {
    setDrafts((prev) =>
      prev ? prev.map((d, i) => (i === index ? { ...d, ...patch } : d)) : prev,
    );
  }

  function removeDraft(index: number) {
    setDrafts((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  function confirmDrafts() {
    if (!drafts || drafts.length === 0) return;
    const now = new Date().toISOString();
    const tasks: Task[] = drafts.map((d) => ({
      id: crypto.randomUUID(),
      title: d.title,
      sourceText: d.sourceText,
      priority: d.priority,
      estimatedMinutes: d.estimatedMinutes,
      deadline: d.deadline,
      scheduledDate: d.scheduledDate,
      position: 0,
      createdAt: now,
      completedAt: null,
    }));
    addTasks(tasks);
    markTipSeen("preview");
    setText("");
    setDrafts(null);
    router.push("/inbox");
  }

  if (welcomeSeen === null) {
    return null;
  }

  if (!welcomeSeen) {
    return (
      <WelcomeScreen
        onStart={() => {
          markWelcomeSeen();
          setWelcomeSeen(true);
        }}
      />
    );
  }

  if (drafts) {
    return (
      <main className="min-h-dvh px-4 pb-8 pt-6">
        <h1 className="mb-1 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
          Перевір задачі
        </h1>
        <p className="mb-4 text-sm text-neutral-400">
          Виправ, що потрібно, або видали зайве, а потім збережи.
        </p>

        {showPreviewTip && (
          <p className="mb-4 rounded-xl bg-card px-4 py-3 text-sm text-neutral-300">
            Це ще не збережено — можна виправити назву, пріоритет, час чи
            дедлайн прямо в картці.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {drafts.map((draft, index) => (
            <div
              key={index}
              className="rounded-2xl bg-card p-5 animate-[fadeInUp_0.2s_ease-out]"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <input
                  value={draft.title}
                  onChange={(e) => updateDraft(index, { title: e.target.value })}
                  className="flex-1 bg-transparent text-lg font-medium text-white outline-none"
                />
                <button
                  onClick={() => removeDraft(index)}
                  aria-label="Видалити задачу"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-neutral-500"
                >
                  ✕
                </button>
              </div>

              <div className="mb-2">
                <label className="mb-1 block text-xs text-neutral-500">
                  Запланована на
                </label>
                <DaySelect
                  value={draft.scheduledDate}
                  onChange={(value) => updateDraft(index, { scheduledDate: value })}
                  className="w-full rounded-lg bg-neutral-800 px-2 py-2 text-neutral-200"
                />
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                <select
                  value={draft.priority}
                  onChange={(e) =>
                    updateDraft(index, { priority: e.target.value as Priority })
                  }
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
                  min={1}
                  value={draft.estimatedMinutes ?? ""}
                  onChange={(e) =>
                    updateDraft(index, {
                      estimatedMinutes: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="хв"
                  className="w-20 rounded-lg bg-neutral-800 px-2 py-2 text-neutral-200"
                />

                <input
                  type="date"
                  value={draft.deadline ?? ""}
                  onChange={(e) =>
                    updateDraft(index, { deadline: e.target.value || null })
                  }
                  className="rounded-lg bg-neutral-800 px-2 py-2 text-neutral-200"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={confirmDrafts}
            disabled={drafts.length === 0}
            className="w-full rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground disabled:opacity-40"
          >
            Зберегти{drafts.length > 0 ? ` (${drafts.length})` : ""}
          </button>
          <button
            onClick={() => setDrafts(null)}
            className="w-full rounded-full bg-neutral-800 py-3 text-base text-neutral-300"
          >
            Скасувати
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh px-4 pb-8 pt-6">
      <h1 className="mb-1 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
        Що в голові?
      </h1>
      <p className="mb-4 text-sm text-neutral-400">
        Вивали все одним текстом — AI розкладе по задачах.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={EXAMPLE_TEXT}
        rows={10}
        className="w-full resize-none rounded-2xl bg-card p-5 text-base text-white outline-none placeholder:text-neutral-500"
      />

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || loading}
          className="w-full rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground disabled:opacity-40"
        >
          {loading ? "Розбираю..." : "Розібрати"}
        </button>
        {!text.trim() && (
          <button
            onClick={handleTryExample}
            disabled={loading}
            className="w-full rounded-full bg-neutral-800 py-3 text-base text-neutral-300"
          >
            Спробувати з прикладом
          </button>
        )}
      </div>
    </main>
  );
}
