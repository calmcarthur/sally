"use client";

import { useCallback, useState } from "react";
import { getStoredPin } from "@/lib/pin";
import { PinGate } from "./PinGate";

/** Ensures write PIN before running an action. Returns true if unlocked. */
export function useWriteGate() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);

  const withWriteAccess = useCallback(async (action: () => void | Promise<void>) => {
    if (getStoredPin()) {
      await action();
      return;
    }
    setPending(() => () => {
      void action();
    });
    setOpen(true);
  }, []);

  const gate = (
    <PinGate
      open={open}
      onClose={() => {
        setOpen(false);
        setPending(null);
      }}
      onUnlocked={() => {
        pending?.();
        setPending(null);
      }}
    />
  );

  return { withWriteAccess, gate };
}
