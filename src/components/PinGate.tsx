"use client";

import { FormEvent, useState } from "react";
import { storePin } from "@/lib/pin";

type Props = {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
};

export function PinGate({ open, onClose, onUnlocked }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Wrong PIN");
      storePin(pin);
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-5 shadow-lg"
      >
        <h2 className="brand text-xl font-bold">Group PIN</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Anyone can look. Writing needs the shared PIN.
        </p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
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
