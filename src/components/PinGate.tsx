"use client";

import { FormEvent, useState } from "react";
import { storePin, type PinKind } from "@/lib/pin-client";

type Props = {
  open: boolean;
  kind?: PinKind;
  onClose: () => void;
  onUnlocked: () => void;
};

export function PinGate({
  open,
  kind = "write",
  onClose,
  onUnlocked,
}: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const isAdmin = kind === "admin";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Wrong PIN");
      storePin(pin, kind);
      setPin("");
      onUnlocked();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wrong PIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-5 shadow-lg"
      >
        <h2 className="brand text-xl font-bold">
          {isAdmin ? "Administrator password" : "Group PIN"}
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          {isAdmin
            ? "Needed to add, restore, or remove people."
            : "Anyone can look. Logging activities and PRs needs the group PIN."}
        </p>
        <input
          type="password"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder={isAdmin ? "Admin password" : "Group PIN"}
          className="mt-4 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none focus:border-[var(--accent)]"
        />
        {error && (
          <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-[var(--border)] px-3 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !pin}
            className="flex-1 rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-[var(--surface-raised)] disabled:opacity-50"
          >
            {loading ? "…" : "Unlock"}
          </button>
        </div>
      </form>
    </div>
  );
}
