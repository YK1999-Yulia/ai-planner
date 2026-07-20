"use client";

import { useState } from "react";
import { TAP_ACTIVE } from "@/lib/ui";

const PRESETS = [15, 30, 60, 120, 240];

function presetLabel(minutes: number): string {
  return minutes < 60 ? `${minutes} хв` : `${minutes / 60} год`;
}

interface DurationSelectProps {
  value: number | null;
  onChange: (minutes: number | null) => void;
}

export function DurationSelect({ value, onChange }: DurationSelectProps) {
  const isPreset = value !== null && PRESETS.includes(value);
  const [customOpen, setCustomOpen] = useState(value !== null && !isPreset);

  const customHours = value !== null && !isPreset ? Math.floor(value / 60) : 0;
  const customMinutes = value !== null && !isPreset ? value % 60 : 0;

  function selectPreset(minutes: number) {
    setCustomOpen(false);
    onChange(minutes);
  }

  function updateCustom(hours: number, minutes: number) {
    const total = hours * 60 + minutes;
    onChange(total > 0 ? total : null);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => selectPreset(p)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${TAP_ACTIVE} ${
              !customOpen && value === p
                ? "bg-accent text-accent-foreground"
                : "bg-neutral-800 text-neutral-300"
            }`}
          >
            {presetLabel(p)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${TAP_ACTIVE} ${
            customOpen ? "bg-accent text-accent-foreground" : "bg-neutral-800 text-neutral-300"
          }`}
        >
          Інше
        </button>
      </div>

      {customOpen && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={customHours || ""}
            onChange={(e) => updateCustom(Number(e.target.value) || 0, customMinutes)}
            placeholder="0"
            className="w-14 rounded-lg bg-neutral-800 px-2 py-2 text-center text-neutral-200"
          />
          <span className="text-xs text-neutral-500">год</span>
          <input
            type="number"
            min={0}
            max={59}
            value={customMinutes || ""}
            onChange={(e) => updateCustom(customHours, Number(e.target.value) || 0)}
            placeholder="0"
            className="w-14 rounded-lg bg-neutral-800 px-2 py-2 text-center text-neutral-200"
          />
          <span className="text-xs text-neutral-500">хв</span>
        </div>
      )}
    </div>
  );
}
