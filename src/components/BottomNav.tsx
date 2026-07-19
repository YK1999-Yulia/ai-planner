"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Занотувати" },
  { href: "/inbox", label: "Вхідні" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-800 bg-neutral-950 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 py-4 text-center text-base font-medium ${
                active ? "text-neutral-100" : "text-neutral-500"
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
