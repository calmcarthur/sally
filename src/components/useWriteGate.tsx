"use client";

import { useCallback, useState } from "react";
import { getStoredPin, type PinKind } from "@/lib/pin-client";
import { PinGate } from "./PinGate";

function usePinGate(kind: PinKind) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);

  const withAccess = useCallback(
    async (action: () => void | Promise<void>) => {
      if (getStoredPin(kind)) {
        await action();
        return;
      }
      setPending(() => () => {
        void action();
      });
      setOpen(true);
    },
    [kind],
  );

  const gate = (
    <PinGate
      open={open}
      kind={kind}
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

  return { withAccess, gate };
}

/** Group PIN — activities + PRs. */
export function useWriteGate() {
  const { withAccess, gate } = usePinGate("write");
  return { withWriteAccess: withAccess, gate };
}

/** Admin password — people add / restore / remove. */
export function useAdminGate() {
  const { withAccess, gate } = usePinGate("admin");
  return { withAdminAccess: withAccess, gate };
}
