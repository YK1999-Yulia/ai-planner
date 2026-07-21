import { DaySelect } from "@/components/DaySelect";
import { TAP_ACTIVE } from "@/lib/ui";
import type { PreviewRow } from "@/hooks/useDistributeWeek";

export function WeekBreakdownPreview({
  rows,
  onChangeRow,
  onConfirm,
  onCancel,
}: {
  rows: PreviewRow[];
  onChangeRow: (id: string, date: string | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <main className="min-h-dvh px-4 pb-8 pt-6 animate-[pageFade_0.15s_ease-out]">
      <h1 className="mb-1 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
        Ось як я розклав тиждень. Підходить?
      </h1>
      <p className="mb-4 text-sm text-neutral-400">
        Зміни день, де треба, а потім застосуй.
      </p>

      <div className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <div
            key={row.id}
            style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
            className="flex items-center justify-between gap-3 rounded-2xl bg-card p-5 animate-[fadeInUp_0.2s_ease-out_backwards]"
          >
            <span className="min-w-0 flex-1 break-words text-base text-white">{row.title}</span>
            <DaySelect
              value={row.scheduledDate}
              onChange={(value) => onChangeRow(row.id, value)}
              excludeNone
              className="w-32 shrink-0"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <button
          onClick={onConfirm}
          className={`w-full rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground ${TAP_ACTIVE}`}
        >
          Застосувати
        </button>
        <button
          onClick={onCancel}
          className={`w-full rounded-full bg-neutral-800 py-3 text-base text-neutral-300 ${TAP_ACTIVE}`}
        >
          Скасувати
        </button>
      </div>
    </main>
  );
}
