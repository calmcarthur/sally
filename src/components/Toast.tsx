"use client";

import { useEffect } from "react";

export function Toast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 3200);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 sm:bottom-6">
      <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--ink)] px-4 py-2 text-sm text-[var(--surface-raised)] shadow-lg">
        {message}
      </div>
    </div>
  );
}
