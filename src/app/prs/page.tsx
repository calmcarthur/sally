"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { ExerciseDef, Person, PersonalRecord } from "@/lib/types";
import type { RecordHolder } from "@/lib/prs";
import { Toast } from "@/components/Toast";
import { useWriteGate } from "@/components/useWriteGate";

type PrData = {
  people: Person[];
  prs: PersonalRecord[];
  holders: RecordHolder[];
  exercises: ExerciseDef[];
  today: string;
};

const CATEGORIES: { key: ExerciseDef["category"]; title: string }[] = [
  { key: "lifting", title: "Lifting (lb)" },
  { key: "calisthenics", title: "Calisthenics" },
  { key: "other", title: "Other" },
  { key: "running", title: "Running" },
];

export default function PrsPage() {
  const [data, setData] = useState<PrData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [personId, setPersonId] = useState("");
  const [exerciseKey, setExerciseKey] = useState("bench");
  const [value, setValue] = useState("");
  const [recordedOn, setRecordedOn] = useState("");
  const [saving, setSaving] = useState(false);
  const { withWriteAccess, gate } = useWriteGate();

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<PrData>("/api/prs");
      setData(d);
      setPersonId((p) =>
        d.people.some((person) => person.id === p)
          ? p
          : d.people[0]?.id || "",
      );
      setRecordedOn((r) => r || d.today);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to load PRs");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const prMap = useMemo(() => {
    const m = new Map<string, PersonalRecord>();
    for (const pr of data?.prs ?? []) {
      m.set(`${pr.personId}:${pr.exerciseKey}`, pr);
    }
    return m;
  }, [data]);

  const holderMap = useMemo(() => {
    const m = new Map<string, RecordHolder>();
    for (const h of data?.holders ?? []) {
      m.set(h.exerciseKey, h);
    }
    return m;
  }, [data]);

  const personName = (id: string | null) =>
    data?.people.find((p) => p.id === id)?.name ?? "—";

  async function doSave() {
    setSaving(true);
    try {
      const next = await apiFetch<PrData>("/api/prs", {
        method: "POST",
        body: JSON.stringify({
          personId,
          exerciseKey,
          value,
          recordedOn,
        }),
      });
      setData(next);
      setToast("PR locked in.");
      setValue("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setToast("PIN required — unlock and try again.");
        void withWriteAccess(doSave);
      } else {
        setToast(e instanceof Error ? e.message : "Save failed");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    void withWriteAccess(doSave);
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-5 text-sm text-[var(--ink-muted)]">
        Loading PRs…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-5 px-4 py-5 pb-24 sm:pb-8 lg:gap-6">
      <div>
        <h1 className="brand text-2xl font-bold sm:text-3xl">PRs</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Push yourself. Sally record holders at the bottom of each board.
        </p>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-sm">
        <h2 className="brand text-xl font-bold">Enter / update</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            <span className="text-[var(--ink-muted)]">Who</span>
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            >
              {data.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm lg:col-span-2">
            <span className="text-[var(--ink-muted)]">Exercise</span>
            <select
              value={exerciseKey}
              onChange={(e) => setExerciseKey(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            >
              {CATEGORIES.map((cat) => (
                <optgroup key={cat.key} label={cat.title}>
                  {data.exercises
                    .filter((e) => e.category === cat.key)
                    .map((e) => (
                      <option key={e.key} value={e.key}>
                        {e.label} ({e.unit})
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-[var(--ink-muted)]">
              Value{" "}
              <span className="opacity-70">
                (time as m:ss or h:mm:ss)
              </span>
            </span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 225 or 22:15"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-[var(--ink-muted)]">Date</span>
            <input
              type="date"
              value={recordedOn}
              max={data.today}
              onChange={(e) => setRecordedOn(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={saving || !value || !personId}
          onClick={handleSave}
          className="mt-4 rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--surface-raised)] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save PR"}
        </button>
      </section>

      {CATEGORIES.map((cat) => {
        const exercises = data.exercises.filter((e) => e.category === cat.key);
        return (
          <section
            key={cat.key}
            className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]"
          >
            <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <h2 className="brand text-lg font-bold">{cat.title}</h2>
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--ink-muted)]">
                <tr>
                  <th className="px-3 py-2">Person</th>
                  {exercises.map((ex) => (
                    <th key={ex.key} className="px-3 py-2">
                      {ex.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.people.map((person) => (
                  <tr
                    key={person.id}
                    className="border-b border-[var(--border)]"
                  >
                    <td className="px-3 py-2.5 font-medium">
                      {person.name}
                      <div className="text-[10px] text-[var(--ink-muted)]">
                        {person.code}
                      </div>
                    </td>
                    {exercises.map((ex) => {
                      const pr = prMap.get(`${person.id}:${ex.key}`);
                      const holder = holderMap.get(ex.key);
                      const isHolder = holder?.personId === person.id;
                      return (
                        <td
                          key={ex.key}
                          className={`px-3 py-2.5 ${
                            isHolder
                              ? "bg-[color-mix(in_srgb,var(--color-sport)_28%,transparent)] font-semibold"
                              : ""
                          }`}
                        >
                          {pr ? (
                            <>
                              <div>{pr.value}</div>
                              <div className="text-[10px] text-[var(--ink-muted)]">
                                {pr.recordedOn}
                              </div>
                            </>
                          ) : (
                            <span className="text-[var(--ink-muted)]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-[var(--surface)] font-medium">
                  <td className="px-3 py-2.5 text-xs uppercase tracking-wide">
                    Sally Record Holder
                  </td>
                  {exercises.map((ex) => {
                    const holder = holderMap.get(ex.key);
                    return (
                      <td key={ex.key} className="px-3 py-2.5">
                        {holder?.personId ? (
                          <>
                            <div>{personName(holder.personId)}</div>
                            <div className="text-xs text-[var(--color-wt)]">
                              {holder.value}
                            </div>
                          </>
                        ) : (
                          <span className="text-[var(--ink-muted)]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </section>
        );
      })}

      <Toast message={toast} onDismiss={() => setToast(null)} />
      {gate}
    </div>
  );
}
