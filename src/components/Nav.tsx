"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/activities", label: "Activities" },
  { href: "/stats", label: "Stats" },
  { href: "/prs", label: "PRs" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/activities" className="brand text-2xl font-bold tracking-tight text-[var(--ink)]">
            Sally
            <span className="ml-2 text-sm font-normal text-[var(--ink-muted)]">
              maggots only
            </span>
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    active
                      ? "bg-[var(--accent)] text-[var(--surface-raised)]"
                      : "text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] backdrop-blur-md sm:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-3">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center py-3 text-xs font-medium ${
                  active
                    ? "text-[var(--accent)]"
                    : "text-[var(--ink-muted)]"
                }`}
              >
                <span
                  className={`mb-1 h-1 w-8 rounded-full ${
                    active ? "bg-[var(--accent)]" : "bg-transparent"
                  }`}
                />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
