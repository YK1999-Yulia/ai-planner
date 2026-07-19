import { dayOptions, formatShortDate, type DayOption } from "@/lib/date";

interface DaySelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  excludeNone?: boolean;
  className?: string;
}

const DEFAULT_CLASSNAME = "w-full rounded-lg bg-neutral-800 px-2 py-2 text-neutral-200";

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
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={className ?? DEFAULT_CLASSNAME}
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
  );
}
