import { TAP_ACTIVE, TAP_TARGET_44 } from "@/lib/ui";

export function TipBanner({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-xl bg-card px-4 py-3 text-sm text-neutral-300 animate-[fadeInUp_0.2s_ease-out_backwards]">
      <p className="min-w-0 flex-1 break-words">{text}</p>
      <button
        onClick={onDismiss}
        aria-label="Закрити підказку"
        className={`shrink-0 text-neutral-500 ${TAP_TARGET_44} ${TAP_ACTIVE}`}
      >
        ✕
      </button>
    </div>
  );
}
