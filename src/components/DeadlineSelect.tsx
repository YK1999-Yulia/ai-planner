import { CalendarCheck } from "lucide-react";

interface DeadlineSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export function DeadlineSelect({ value, onChange, className }: DeadlineSelectProps) {
  return (
    <div className={`relative min-w-0 overflow-hidden rounded-lg ${className ?? ""}`}>
      <CalendarCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={`w-full min-w-0 max-w-full rounded-lg border border-white/10 bg-card py-2 pr-9 pl-9 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:rounded [&::-webkit-calendar-picker-indicator]:bg-transparent [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:invert ${
          value ? "text-neutral-200" : "text-transparent"
        }`}
      />
      {!value && (
        <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-neutral-500">
          Без дедлайну
        </span>
      )}
    </div>
  );
}
