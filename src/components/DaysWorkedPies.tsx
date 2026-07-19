"use client";

import type { PersonStats } from "@/lib/types";

/** Simple SVG pie: worked days vs remaining eligible days. */
export function DaysWorkedPies({ stats }: { stats: PersonStats[] }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
      <h2 className="brand text-lg font-bold">% days worked on yourself</h2>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">
        Green = active days · beige = eligible days still empty. Join-date safe.
      </p>
      <div className="mt-5 flex flex-wrap justify-around gap-4 sm:gap-6">
        {stats.map((s) => {
          const pct = Math.min(100, Math.max(0, s.percentDaysWorked));
          const r = 40;
          const c = 2 * Math.PI * r;
          const filled = (pct / 100) * c;
          return (
            <div
              key={s.person.id}
              className="flex w-36 flex-col items-center gap-2"
            >
              <div className="relative h-28 w-28">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="14"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="var(--color-cardio)"
                    strokeWidth="14"
                    strokeDasharray={`${filled} ${c - filled}`}
                    strokeLinecap="butt"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold leading-none">
                    {s.percentDaysWorked}%
                  </span>
                </div>
              </div>
              <div className="text-center text-sm font-semibold">
                {s.person.name}
              </div>
              <div className="text-center text-[10px] text-[var(--ink-muted)]">
                {s.daysActive}/{s.eligibleDays} days
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
