"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { TAP_ACTIVE } from "@/lib/ui";
import {
  subscribeWelcome,
  getShowWelcome,
  getShowWelcomeServerSnapshot,
} from "@/lib/welcome-store";
import {
  subscribeTasks,
  getTasksSnapshot,
  getTasksServerSnapshot,
} from "@/lib/tasks-store";
import { todayString } from "@/lib/date";

type BadgeKey = "today" | "inbox";

const TABS: { href: string; label: string; badge?: BadgeKey }[] = [
  { href: "/", label: "Занотувати" },
  { href: "/inbox", label: "Вхідні", badge: "inbox" },
  { href: "/week", label: "Тиждень" },
  { href: "/today", label: "Сьогодні", badge: "today" },
];

export function BottomNav() {
  const pathname = usePathname();
  const showWelcome = useSyncExternalStore(
    subscribeWelcome,
    getShowWelcome,
    getShowWelcomeServerSnapshot,
  );
  const allTasks = useSyncExternalStore(
    subscribeTasks,
    getTasksSnapshot,
    getTasksServerSnapshot,
  );

  if (pathname === "/" && showWelcome) {
    return null;
  }

  const today = todayString();
  const todayCount = allTasks.filter(
    (t) => t.scheduledDate === today && t.completedAt === null,
  ).length;
  const inboxCount = allTasks.filter(
    (t) => t.scheduledDate === null && t.completedAt === null,
  ).length;
  const hasOverdue = allTasks.some(
    (t) => t.scheduledDate !== null && t.scheduledDate < today && t.completedAt === null,
  );
  const badgeCounts: Record<BadgeKey, number> = { today: todayCount, inbox: inboxCount };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md gap-1 p-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const count = tab.badge ? badgeCounts[tab.badge] : 0;
          const showDot = tab.badge === "today" && hasOverdue;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex-1 rounded-xl py-3 text-center text-sm ${TAP_ACTIVE} ${
                active
                  ? "bg-accent font-semibold text-accent-foreground"
                  : "font-medium text-neutral-500"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="absolute right-2 top-1.5 inline-flex">
                  <span
                    className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ${
                      active ? "bg-accent-foreground text-accent" : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {count}
                  </span>
                  {showDot && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </span>
              )}
              {count === 0 && showDot && (
                <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
