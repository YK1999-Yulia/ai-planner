"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Занотувати" },
  { href: "/inbox", label: "Вхідні" },
  { href: "/week", label: "Тиждень" },
  { href: "/today", label: "Сьогодні" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md gap-1 p-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 rounded-xl py-3 text-center text-sm transition-colors duration-150 ${
                active
                  ? "bg-accent font-semibold text-accent-foreground"
                  : "font-medium text-neutral-500"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
