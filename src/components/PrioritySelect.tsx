import { ChevronDown, Flag } from "lucide-react";
import { PRIORITY_LABELS } from "@/lib/priority";
import type { Priority } from "@/lib/types";

interface PrioritySelectProps {
  value: Priority;
  onChange: (value: Priority) => void;
  className?: string;
}

export function PrioritySelect({ value, onChange, className }: PrioritySelectProps) {
  return (
    <div className={`relative min-w-0 overflow-hidden rounded-lg ${className ?? ""}`}>
      <Flag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Priority)}
        className="w-full min-w-0 max-w-full appearance-none rounded-lg border border-white/10 bg-card py-2 pr-8 pl-9 text-sm text-neutral-200"
      >
        {Object.entries(PRIORITY_LABELS).map(([optValue, label]) => (
          <option key={optValue} value={optValue}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
    </div>
  );
}
