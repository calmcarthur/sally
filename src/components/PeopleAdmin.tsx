"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Person } from "@/lib/types";
import { useAdminGate } from "./useWriteGate";

function todayISOClient() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

export function PeopleAdmin({ open, onClose, onChanged }: Props) {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [joinDate, setJoinDate] = useState(todayISOClient());
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<Person | null>(null);
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0);
  const { withAdminAccess, gate } = useAdminGate();

  useEffect(() => {
    if (!open) return;
    setError(null);
    void withAdminAccess(async () => {
      try {
        const d = await apiFetch<{ people: Person[] }>("/api/people?all=1", {
          pinKind: "admin",
        });
        setPeople(d.people);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open only
  }, [open]);

  if (!open) return null;

  const active = people.filter((p) => p.active);
  const archived = people.filter((p) => !p.active);

  async function refresh() {
    await withAdminAccess(async () => {
      const d = await apiFetch<{ people: Person[] }>("/api/people?all=1", {
        pinKind: "admin",
      });
      setPeople(d.people);
      onChanged?.();
    });
  }

  async function doAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    await withAdminAccess(async () => {
      try {
        const d = await apiFetch<{
          people: Person[];
          restored?: boolean;
        }>("/api/people", {
          method: "POST",
          pinKind: "admin",
          body: JSON.stringify({ name, code, joinDate }),
        });
        setPeople(d.people);
        setInfo(
          d.restored
            ? `Restored ${name} (${code.toUpperCase()}) — history intact.`
            : `Added ${name}.`,
        );
        setName("");
        setCode("");
        setJoinDate(todayISOClient());
        onChanged?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add");
      }
    });
  }

  function startRemove(person: Person) {
    setPendingRemove(person);
    setConfirmStep(1);
    setError(null);
    setInfo(null);
  }

  function cancelRemove() {
    setPendingRemove(null);
    setConfirmStep(0);
  }

  async function confirmRemoveStep() {
    if (!pendingRemove) return;
    if (confirmStep === 1) {
      setConfirmStep(2);
      return;
    }
    await withAdminAccess(async () => {
      try {
        const d = await apiFetch<{ people: Person[] }>("/api/people", {
          method: "DELETE",
          pinKind: "admin",
          body: JSON.stringify({ id: pendingRemove.id }),
        });
        setPeople(d.people);
        setInfo(
          `${pendingRemove.name} hidden. Re-add with code ${pendingRemove.code} to restore.`,
        );
        cancelRemove();
        onChanged?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove");
      }
    });
  }

  async function restore(person: Person) {
    setError(null);
    setInfo(null);
    await withAdminAccess(async () => {
      try {
        const d = await apiFetch<{ people: Person[]; restored?: boolean }>(
          "/api/people",
          {
            method: "POST",
            pinKind: "admin",
            body: JSON.stringify({
              name: person.name,
              code: person.code,
              joinDate: person.joinDate,
            }),
          },
        );
        setPeople(d.people);
        setInfo(`Restored ${person.name} — all history back on the board.`);
        onChanged?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to restore");
      }
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
        <div className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-5 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="brand text-xl font-bold">People</h2>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Administrator only. Code is permanent — remove hides them; data
                stays until you restore with the same code.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-sm"
            >
              Close
            </button>
          </div>

          <ul className="mt-4 divide-y divide-[var(--border)]">
            {active.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div>
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-[var(--ink-muted)]">
                    {p.code} · joined {p.joinDate}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startRemove(p)}
                  className="rounded-md border border-[var(--danger)]/40 px-2 py-1 text-xs text-[var(--danger)]"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          {archived.length > 0 && (
            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                Hidden (data kept)
              </h3>
              <ul className="mt-2 divide-y divide-[var(--border)]">
                {archived.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div>
                      <div className="text-sm text-[var(--ink-muted)]">
                        {p.name}
                      </div>
                      <div className="text-xs text-[var(--ink-muted)]">
                        {p.code}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void restore(p)}
                      className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {confirmStep > 0 && pendingRemove && (
            <div className="mt-4 rounded-lg border border-[var(--danger)]/50 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] p-3">
              {confirmStep === 1 ? (
                <p className="text-sm">
                  Hide <strong>{pendingRemove.name}</strong> from the board?
                </p>
              ) : (
                <p className="text-sm">
                  Final confirm: <strong>{pendingRemove.name}</strong> drops
                  off Activities / Stats / PRs. Their logs and PRs stay in the
                  DB — re-add with code{" "}
                  <strong>{pendingRemove.code}</strong> to bring them back.
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={cancelRemove}
                  className="flex-1 rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmRemoveStep()}
                  className="flex-1 rounded-md bg-[var(--danger)] px-3 py-2 text-sm font-semibold text-[var(--surface-raised)]"
                >
                  {confirmStep === 1 ? "Yes, continue" : "Hide them"}
                </button>
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => void doAdd(e)}
            className="mt-5 space-y-3 border-t border-[var(--border)] pt-4"
          >
            <h3 className="text-sm font-semibold">Add / restore</h3>
            <p className="text-xs text-[var(--ink-muted)]">
              New code = new person. Existing hidden code = restore with full
              history (join date ignored on restore).
            </p>
            <input
              required
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Code e.g. XX008"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <label className="block text-xs text-[var(--ink-muted)]">
              Join date (new people only)
              <input
                type="date"
                required
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--surface-raised)]"
            >
              Add
            </button>
          </form>

          {info && (
            <p className="mt-3 text-sm text-[var(--color-wt)]">{info}</p>
          )}
          {error && (
            <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
          )}

          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-3 text-xs text-[var(--ink-muted)] underline"
          >
            Refresh list
          </button>
        </div>
      </div>
      {gate}
    </>
  );
}
