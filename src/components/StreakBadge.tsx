"use client";

import { STREAK_THRESHOLD } from "@/lib/constants";

export function StreakBadge({
  streak,
  compact = false,
}: {
  streak: number;
  compact?: boolean;
}) {
  if (streak < STREAK_THRESHOLD) {
    if (compact || streak === 0) return null;
    return (
      <span className="text-xs text-[var(--ink-muted)]" title="Current streak">
        {streak}d
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-[var(--color-wt)] px-1.5 py-0.5 text-xs font-semibold text-[var(--surface-raised)]"
      title={`${streak}-day streak`}
    >
      <span aria-hidden>🔥</span>
      {streak}
    </span>
  );
}
