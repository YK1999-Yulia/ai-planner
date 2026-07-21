import { CalendarDays, ChevronDown } from "lucide-react";
import { dayOptions, formatShortDate, type DayOption } from "@/lib/date";

interface DaySelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  excludeNone?: boolean;
  className?: string;
}

export function DaySelect({ value, onChange, excludeNone, className }: DaySelectProps) {
  let options = dayOptions();

  if (excludeNone) {
    options = options.filter((o) => o.value !== null);
  }

  if (value !== null && !options.some((o) => o.value === value)) {
    options = [{ value, label: formatShortDate(value) }, ...options];
  }

  const ungrouped = options.filter((o) => !o.group);
  const groups = new Map<string, DayOption[]>();
  for (const opt of options) {
    if (!opt.group) continue;
    if (!groups.has(opt.group)) groups.set(opt.group, []);
    groups.get(opt.group)!.push(opt);
  }

  return (
    <div className={`relative min-w-0 overflow-hidden rounded-lg ${className ?? ""}`}>
      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full min-w-0 max-w-full appearance-none rounded-lg border border-white/10 bg-card py-2 pr-8 pl-9 text-neutral-200"
      >
        {ungrouped.map((opt) => (
          <option key={opt.value ?? "none"} value={opt.value ?? ""}>
            {opt.label}
          </option>
        ))}
        {Array.from(groups.entries()).map(([label, opts]) => (
          <optgroup key={label} label={label}>
            {opts.map((opt) => (
              <option key={opt.value} value={opt.value as string}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
    </div>
  );
}
