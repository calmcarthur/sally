"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { Blockout, Person } from "@/lib/types";

type Props = {
  people: Person[];
  personId: string;
  onPersonChange: (id: string) => void;
  onChanged: () => void;
  withWriteAccess: (fn: () => void | Promise<void>) => Promise<void>;
  onToast: (message: string) => void;
};

function todayISOClient() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BlockOutPanel({
  people,
  personId,
  onPersonChange,
  onChanged,
  withWriteAccess,
  onToast,
}: Props) {
  const [startDate, setStartDate] = useState(todayISOClient());
  const [endDate, setEndDate] = useState(todayISOClient());
  const [blockouts, setBlockouts] = useState<Blockout[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!personId) {
      setBlockouts([]);
      return;
    }
    void (async () => {
      try {
        const d = await apiFetch<{ blockouts: Blockout[] }>(
          `/api/blockouts?personId=${encodeURIComponent(personId)}`,
        );
        setBlockouts(d.blockouts);
      } catch {
        setBlockouts([]);
      }
    })();
  }, [personId]);

  async function apply(e: FormEvent) {
    e.preventDefault();
    if (!personId) return;
    setSaving(true);
    await withWriteAccess(async () => {
      try {
        const d = await apiFetch<{ blockouts: Blockout[] }>("/api/blockouts", {
          method: "POST",
          body: JSON.stringify({ personId, startDate, endDate }),
        });
        setBlockouts(d.blockouts);
        onToast("Blocked out.");
        onChanged();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          onToast("PIN required — unlock and try again.");
        } else {
          onToast(err instanceof Error ? err.message : "Block failed");
        }
      } finally {
        setSaving(false);
      }
    });
    setSaving(false);
  }

  async function removeRange(id: string) {
    setSaving(true);
    await withWriteAccess(async () => {
      try {
        const d = await apiFetch<{ blockouts: Blockout[] }>(
          `/api/blockouts?id=${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        setBlockouts(d.blockouts);
        onToast("Blockout removed.");
        onChanged();
      } catch (err) {
        onToast(err instanceof Error ? err.message : "Remove failed");
      } finally {
        setSaving(false);
      }
    });
    setSaving(false);
  }

  const minJoin = people.find((p) => p.id === personId)?.joinDate;

  return (
    <section className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="brand text-xl font-bold">Block out</h2>
        <p className="text-xs text-[var(--ink-muted)]">
          Hurt / sick / extenuating circumstances — X on the grid, skipped in stats
        </p>
      </div>

      <form
        onSubmit={(e) => void apply(e)}
        className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2"
      >
        <label className="block min-w-0 text-sm sm:col-span-2">
          <span className="text-[var(--ink-muted)]">Who</span>
          <select
            value={personId}
            onChange={(e) => onPersonChange(e.target.value)}
            className="mt-1 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0 text-sm">
          <span className="text-[var(--ink-muted)]">From</span>
          <input
            type="date"
            required
            value={startDate}
            min={minJoin}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full min-w-0 max-w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          />
        </label>
        <label className="block min-w-0 text-sm">
          <span className="text-[var(--ink-muted)]">To</span>
          <input
            type="date"
            required
            value={endDate}
            min={startDate || minJoin}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full min-w-0 max-w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={saving || !personId}
          className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] py-3 text-sm font-semibold transition hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] disabled:opacity-50 sm:col-span-2"
        >
          {saving ? "Saving…" : "Apply blockout"}
        </button>
      </form>

      {blockouts.length > 0 && (
        <ul className="mt-4 divide-y divide-[var(--border)] border-t border-[var(--border)] pt-3">
          {blockouts.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span>
                {b.startDate === b.endDate
                  ? b.startDate
                  : `${b.startDate} → ${b.endDate}`}
              </span>
              <button
                type="button"
                disabled={saving}
                onClick={() => void removeRange(b.id)}
                className="text-xs text-[var(--danger)] underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
