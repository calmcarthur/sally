"use client";

import { ACTIVITY_TYPES, type ActivityKey } from "@/lib/constants";
import type { Person } from "@/lib/types";

type Flags = Record<ActivityKey, boolean>;

type Props = {
  people: Person[];
  personId: string;
  date: string;
  flags: Flags;
  saving: boolean;
  onPersonChange: (id: string) => void;
  onDateChange: (date: string) => void;
  onFlagsChange: (flags: Flags) => void;
  onSave: () => void;
  /** App-timezone today (YYYY-MM-DD) — caps the date picker. */
  maxDate?: string;
  /** Earliest selectable date (usually join date). */
  minDate?: string;
  todayEmptyNudge?: string | null;
};

export function LogPanel({
  people,
  personId,
  date,
  flags,
  saving,
  onPersonChange,
  onDateChange,
  onFlagsChange,
  onSave,
  maxDate,
  minDate,
  todayEmptyNudge,
}: Props) {
  function toggle(key: ActivityKey) {
    onFlagsChange({ ...flags, [key]: !flags[key] });
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="brand text-xl font-bold">Log it</h2>
        <p className="text-xs text-[var(--ink-muted)]">
          Multi-select · blank day = clear
        </p>
      </div>

      {todayEmptyNudge && (
        <p className="mt-2 rounded-md bg-[color-mix(in_srgb,var(--color-sport)_35%,transparent)] px-3 py-2 text-sm">
          {todayEmptyNudge}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[var(--ink-muted)]">Who</span>
          <select
            value={personId}
            onChange={(e) => onPersonChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-[var(--ink-muted)]">When</span>
          <input
            type="date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ACTIVITY_TYPES.map((a) => {
          const on = flags[a.key];
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => toggle(a.key)}
              className={`rounded-lg border-2 px-3 py-3 text-left text-sm font-medium transition ${
                on
                  ? "border-transparent text-[var(--surface-raised)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink)]"
              }`}
              style={on ? { background: a.color } : undefined}
            >
              <span
                className="mb-1 block h-2 w-2 rounded-sm"
                style={{ background: on ? "rgba(255,255,255,0.7)" : a.color }}
              />
              {a.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving || !personId}
        className="mt-4 w-full rounded-lg bg-[var(--accent)] py-3 text-sm font-semibold text-[var(--surface-raised)] transition hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {saving ? "Saving…" : "Save day"}
      </button>
    </section>
  );
}
