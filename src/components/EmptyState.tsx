import Link from "next/link";
import { TAP_ACTIVE } from "@/lib/ui";

interface EmptyStateProps {
  icon: string;
  text: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

/** Shared empty-state template used across every screen: icon + one line + at most one button. */
export function EmptyState({
  icon,
  text,
  subtitle,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <span className="mb-3 text-4xl" aria-hidden>
        {icon}
      </span>
      <p className={subtitle ? "mb-1 text-neutral-300" : "mb-6 text-neutral-300"}>{text}</p>
      {subtitle && <p className="mb-6 text-sm text-neutral-500">{subtitle}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className={`mb-3 w-full max-w-xs rounded-full bg-accent py-4 text-base font-semibold text-accent-foreground ${TAP_ACTIVE}`}
        >
          {actionLabel}
        </Link>
      )}
      {secondaryLabel && secondaryHref && (
        <Link href={secondaryHref} className={`text-sm text-neutral-500 underline ${TAP_ACTIVE}`}>
          {secondaryLabel}
        </Link>
      )}
    </div>
  );
}
