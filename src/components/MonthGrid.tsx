"use client";

import { ACTIVITY_TYPES, type ActivityKey } from "@/lib/constants";
import type { PersonMonthRow } from "@/lib/types";
import { StreakBadge } from "./StreakBadge";
import { format, parseISO } from "date-fns";

type Props = {
  year: number;
  month: number;
  rows: PersonMonthRow[];
  onPrev: () => void;
  onNext: () => void;
  onSelectDay: (personId: string, date: string) => void;
  selected?: { personId: string; date: string } | null;
  /** Latest selectable date (usually today+1). Days after this are disabled. */
  maxDate?: string;
};

const FLAG_KEYS: ActivityKey[] = [
  "weightTraining",
  "cardio",
  "sport",
  "activeRecovery",
];

export function MonthGrid({
  year,
  month,
  rows,
  onPrev,
  onNext,
  onSelectDay,
  selected,
  maxDate,
}: Props) {
  const label = format(new Date(year, month - 1, 1), "MMMM yyyy");
  const dayCount = rows[0]?.days.length ?? 0;

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="brand text-xl font-bold">The month</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="min-w-[9rem] text-center text-sm font-medium">
            {label}
          </span>
          <button
            type="button"
            onClick={onNext}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--ink-muted)]">
        {ACTIVITY_TYPES.map((a) => (
          <span key={a.key} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: a.color }}
            />
            {a.short}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--border)]" />
          Nothing
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="relative inline-block h-2.5 w-2.5 rounded-sm bg-[color-mix(in_srgb,var(--border)_55%,transparent)]">
            <span className="absolute inset-0 flex items-center justify-center text-[8px] leading-none text-[var(--ink-muted)]">
              ×
            </span>
          </span>
          Blocked
        </span>
      </div>

      <div className="mt-4 overflow-x-auto pb-2">
        <div className="min-w-max">
          {/* day headers */}
          <div
            className="mb-1 grid gap-0.5 pl-[7.5rem]"
            style={{
              gridTemplateColumns: `repeat(${dayCount}, minmax(1.1rem, 1.35rem))`,
            }}
          >
            {rows[0]?.days.map((d) => {
              const day = parseISO(d.date);
              return (
                <div
                  key={d.date}
                  className="text-center text-[10px] leading-tight text-[var(--ink-muted)]"
                >
                  <div>{format(day, "d")}</div>
                  <div className="opacity-70">{format(day, "EEEEE")}</div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <div key={row.person.id} className="flex items-center gap-2">
                <div className="flex w-[7rem] shrink-0 items-center gap-1.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {row.person.name}
                    </div>
                    <div className="truncate text-[10px] text-[var(--ink-muted)]">
                      {row.person.code}
                    </div>
                  </div>
                  <StreakBadge streak={row.currentStreak} />
                </div>
                <div
                  className="grid flex-1 gap-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${dayCount}, minmax(1.1rem, 1.35rem))`,
                  }}
                >
                  {row.days.map((day) => {
                    const isSelected =
                      selected?.personId === row.person.id &&
                      selected?.date === day.date;
                    const tooFar =
                      Boolean(maxDate) && day.date > (maxDate as string);
                    const segments = FLAG_KEYS.filter((k) => day[k]);
                    return (
                      <button
                        key={day.date}
                        type="button"
                        title={
                          tooFar
                            ? `${row.person.name} · ${day.date} · too far ahead`
                            : `${row.person.name} · ${day.date}${day.blocked ? " · blocked" : ""}`
                        }
                        disabled={tooFar}
                        onClick={() =>
                          onSelectDay(row.person.id, day.date)
                        }
                        className={`relative flex h-9 flex-col overflow-hidden rounded-sm border transition ${
                          tooFar
                            ? "cursor-not-allowed opacity-35"
                            : isSelected
                              ? "border-[var(--border-strong)] ring-2 ring-[var(--accent)]"
                              : "border-transparent hover:border-[var(--border)]"
                        } ${
                          day.blocked
                            ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)]"
                            : day.hasActivity
                              ? "bg-[var(--surface)]"
                              : "bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
                        }`}
                      >
                        {day.blocked ? (
                          <span
                            className="flex flex-1 items-center justify-center text-sm font-semibold leading-none text-[var(--ink-muted)]"
                            aria-label="Blocked"
                          >
                            ×
                          </span>
                        ) : segments.length === 0 ? (
                          <span className="flex-1" />
                        ) : (
                          segments.map((key) => {
                            const color = ACTIVITY_TYPES.find(
                              (a) => a.key === key,
                            )!.color;
                            return (
                              <span
                                key={key}
                                className="min-h-[2px] flex-1"
                                style={{ background: color }}
                              />
                            );
                          })
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="mt-4 text-sm text-[var(--ink-muted)]">
          No people yet.
        </p>
      )}
    </section>
  );
}
