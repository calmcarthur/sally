"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ACTIVITY_TYPES, APP_START_YEAR } from "@/lib/constants";
import type { Leaderboard } from "@/lib/stats";
import { monthLabel } from "@/lib/stats";
import type { PersonStats } from "@/lib/types";
import { DaysWorkedPies } from "@/components/DaysWorkedPies";
import { StreakBadge } from "@/components/StreakBadge";
import { Toast } from "@/components/Toast";

type Scope = "year" | "lifetime";

export default function StatsPage() {
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const end = Math.max(currentYear, APP_START_YEAR);
    const years: number[] = [];
    for (let y = APP_START_YEAR; y <= end; y++) years.push(y);
    return years;
  }, [currentYear]);

  const [scope, setScope] = useState<Scope>("year");
  const [year, setYear] = useState(
    currentYear < APP_START_YEAR ? APP_START_YEAR : currentYear,
  );
  const [stats, setStats] = useState<PersonStats[]>([]);
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = scope === "lifetime" ? "lifetime" : String(year);
      const data = await apiFetch<{
        stats: PersonStats[];
        leaderboards: Leaderboard[];
      }>(`/api/stats?year=${q}`);
      setStats(data.stats);
      setLeaderboards(data.leaderboards);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [scope, year]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener("sally:people-changed", onChange);
    return () => window.removeEventListener("sally:people-changed", onChange);
  }, [load]);

  const maxBar = Math.max(
    1,
    ...stats.flatMap((s) => [
      s.weightTraining,
      s.cardio,
      s.sport,
      s.activeRecovery,
    ]),
  );

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-5 px-4 py-5 pb-24 sm:pb-8 lg:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="brand text-2xl font-bold sm:text-3xl">Stats</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Hard work always pays off. Check your stats.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
            <button
              type="button"
              onClick={() => setScope("year")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                scope === "year"
                  ? "bg-[var(--accent)] text-[var(--surface-raised)]"
                  : "text-[var(--ink-muted)]"
              }`}
            >
              Yearly
            </button>
            <button
              type="button"
              onClick={() => setScope("lifetime")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                scope === "lifetime"
                  ? "bg-[var(--accent)] text-[var(--surface-raised)]"
                  : "text-[var(--ink-muted)]"
              }`}
            >
              Lifetime
            </button>
          </div>
          {scope === "year" && yearOptions.length > 1 && (
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1.5 text-sm"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
          {scope === "year" && yearOptions.length === 1 && (
            <span className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1.5 text-sm">
              {yearOptions[0]}
            </span>
          )}
        </div>
      </div>

      {loading && stats.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">Crunching…</p>
      ) : (
        <>
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <h2 className="brand text-xl font-bold">
              Exercise counts
              {scope === "year" ? ` · ${year}` : " · lifetime"}
            </h2>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--ink-muted)]">
              {ACTIVITY_TYPES.map((a) => (
                <span key={a.key} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: a.color }}
                  />
                  {a.label}
                </span>
              ))}
            </div>
            {/* Mobile: horizontal bars — readable without sideways squeeze */}
            <div className="mt-5 space-y-5 sm:hidden">
              {stats.map((s) => (
                <div key={s.person.id}>
                  <div className="mb-2 text-sm font-semibold">{s.person.name}</div>
                  <div className="space-y-1.5">
                    {(
                      [
                        ["weightTraining", "WT", s.weightTraining],
                        ["cardio", "Cardio", s.cardio],
                        ["sport", "Sport", s.sport],
                        ["activeRecovery", "AR", s.activeRecovery],
                      ] as const
                    ).map(([key, label, val]) => {
                      const color = ACTIVITY_TYPES.find(
                        (a) => a.key === key,
                      )!.color;
                      const pct = Math.max(
                        val === 0 ? 0 : 4,
                        (val / maxBar) * 100,
                      );
                      return (
                        <div
                          key={key}
                          className="grid grid-cols-[3.25rem_1fr_2rem] items-center gap-2"
                        >
                          <span className="text-xs text-[var(--ink-muted)]">
                            {label}
                          </span>
                          <div className="h-3.5 overflow-hidden rounded-sm bg-[var(--border)]/50">
                            <div
                              className="h-full rounded-sm transition-[width]"
                              style={{
                                width: `${pct}%`,
                                background: color,
                                opacity: val === 0 ? 0.35 : 1,
                              }}
                            />
                          </div>
                          <span className="text-right text-xs font-bold tabular-nums">
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: vertical grouped bars */}
            <div className="mt-6 hidden overflow-x-auto pb-1 sm:block">
              <div className="flex min-w-min items-end justify-center gap-8 px-2">
                {stats.map((s) => {
                  const series = [
                    ["weightTraining", s.weightTraining],
                    ["cardio", s.cardio],
                    ["sport", s.sport],
                    ["activeRecovery", s.activeRecovery],
                  ] as const;
                  return (
                    <div
                      key={s.person.id}
                      className="flex w-[7.5rem] shrink-0 flex-col items-center"
                    >
                      {/* Fixed chart plot — labels + bars share one baseline */}
                      <div className="flex h-52 w-full items-end justify-center gap-1">
                        {series.map(([key, val]) => {
                          const color = ACTIVITY_TYPES.find(
                            (a) => a.key === key,
                          )!.color;
                          const barH =
                            val <= 0
                              ? 3
                              : Math.max(8, Math.round((val / maxBar) * 168));
                          return (
                            <div
                              key={key}
                              className="flex h-full w-6 flex-col items-center justify-end"
                              title={`${key}: ${val}`}
                            >
                              <span className="mb-1 text-[11px] font-bold tabular-nums leading-none text-[var(--ink)]">
                                {val}
                              </span>
                              <div
                                className="w-full rounded-t-sm"
                                style={{
                                  height: barH,
                                  background: color,
                                  opacity: val <= 0 ? 0.35 : 1,
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-center text-xs font-semibold">
                        {s.person.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <DaysWorkedPies stats={stats} />

          <section className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface)] text-xs uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-3 py-2">Identity</th>
                  <th className="px-3 py-2">WT</th>
                  <th className="px-3 py-2">Cardio</th>
                  <th className="px-3 py-2">Sport</th>
                  <th className="px-3 py-2">AR</th>
                  <th className="px-3 py-2">Act:AR</th>
                  <th className="px-3 py-2">Records</th>
                  <th className="px-3 py-2">% days</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Streak</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr
                    key={s.person.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 font-medium">
                        {s.person.name}
                        <StreakBadge streak={s.currentStreak} />
                      </div>
                      <div className="text-xs text-[var(--ink-muted)]">
                        {s.person.code} · joined {s.person.joinDate}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">{s.weightTraining}</td>
                    <td className="px-3 py-2.5">{s.cardio}</td>
                    <td className="px-3 py-2.5">{s.sport}</td>
                    <td className="px-3 py-2.5">{s.activeRecovery}</td>
                    <td className="px-3 py-2.5">{s.activityToArRatio}</td>
                    <td className="px-3 py-2.5">{s.sallyRecordsHeld}</td>
                    <td className="px-3 py-2.5">
                      {s.percentDaysWorked}%
                      <div className="text-[10px] text-[var(--ink-muted)]">
                        {s.daysActive}/{s.eligibleDays} days
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-semibold">
                      {s.totalExercises}
                    </td>
                    <td className="px-3 py-2.5">
                      <div>now {s.currentStreak}</div>
                      <div className="text-[10px] text-[var(--ink-muted)]">
                        best {s.bestStreak}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="grid min-w-0 gap-4 lg:grid-cols-2">
            <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <h2 className="brand text-lg font-bold">Category mix</h2>
              <div className="mt-4 space-y-4">
                {stats.map((s) => (
                  <div key={s.person.id} className="min-w-0">
                    <div className="mb-1 text-sm font-medium">
                      {s.person.name}
                    </div>
                    <div className="flex h-3 min-w-0 overflow-hidden rounded-sm">
                      {(
                        [
                          ["weightTraining", s.categoryMix.weightTraining],
                          ["cardio", s.categoryMix.cardio],
                          ["sport", s.categoryMix.sport],
                          ["activeRecovery", s.categoryMix.activeRecovery],
                        ] as const
                      ).map(([key, pct]) =>
                        pct > 0 ? (
                          <div
                            key={key}
                            className="min-w-0"
                            style={{
                              width: `${pct}%`,
                              background: ACTIVITY_TYPES.find(
                                (a) => a.key === key,
                              )!.color,
                            }}
                            title={`${key} ${pct}%`}
                          />
                        ) : null,
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <h2 className="brand text-lg font-bold">Last 6 months</h2>
              <p className="text-xs text-[var(--ink-muted)]">
                24 weeks · filled = at least 4 active days that week
              </p>
              <div className="mt-4 space-y-3">
                {stats.map((s) => (
                  <div
                    key={s.person.id}
                    className="flex min-w-0 items-center gap-2"
                  >
                    <span className="w-14 shrink-0 truncate text-xs font-medium sm:w-16">
                      {s.person.name}
                    </span>
                    <div className="grid min-w-0 flex-1 grid-cols-24 gap-px">
                      {s.weeklyActive.map((on, i) => (
                        <span
                          key={i}
                          className={`h-3.5 min-w-0 rounded-[1px] sm:h-4 ${
                            on
                              ? "bg-[var(--color-cardio)]"
                              : "bg-[var(--border)]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {scope === "year" && (
            <section className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <h2 className="brand text-lg font-bold">
                Month-over-month · {year}
              </h2>
              <div className="mt-4 grid min-w-0 gap-x-6 gap-y-5 sm:grid-cols-2">
                {stats.map((s) => {
                  const maxM = Math.max(
                    1,
                    ...s.monthlyTotals.map((m) => m.total),
                  );
                  return (
                    <div key={s.person.id} className="min-w-0">
                      <div className="mb-1 text-sm font-medium">
                        {s.person.name}
                      </div>
                      <div className="flex w-full items-end gap-px sm:gap-0.5">
                        {s.monthlyTotals.map((m) => (
                          <div
                            key={m.month}
                            className="flex min-w-0 flex-1 flex-col items-center gap-0.5"
                          >
                            <span className="text-[9px] font-semibold tabular-nums leading-none text-[var(--ink)] sm:text-[10px]">
                              {m.total > 0 ? m.total : "\u00a0"}
                            </span>
                            <div
                              className="w-full max-w-[1.25rem] rounded-t-sm bg-[var(--color-wt)]"
                              style={{
                                height: `${Math.max(2, (m.total / maxM) * 56)}px`,
                                opacity: m.total === 0 ? 0.25 : 1,
                              }}
                              title={`${monthLabel(m.month)}: ${m.total}`}
                            />
                            <span className="truncate text-[8px] leading-none text-[var(--ink-muted)] sm:text-[9px]">
                              {monthLabel(m.month)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-3">
            <h2 className="brand text-base font-bold">Head-to-head</h2>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {leaderboards.map((lb) => (
                <div
                  key={lb.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-2"
                  title={lb.subtitle}
                >
                  <div className="truncate text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">
                    {lb.title}
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-1">
                    <span className="truncate text-sm font-semibold">
                      {lb.winnerName ?? "—"}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--color-wt)]">
                      {lb.winnerValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
