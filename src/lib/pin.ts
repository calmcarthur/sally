import { createHash, timingSafeEqual } from "crypto";

const PIN_STORAGE_KEY = "sally_write_pin";

export function getStoredPin(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PIN_STORAGE_KEY);
}

export function storePin(pin: string) {
  localStorage.setItem(PIN_STORAGE_KEY, pin);
}

export function clearStoredPin() {
  localStorage.removeItem(PIN_STORAGE_KEY);
}

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

/** Server-side: validate submitted PIN against env. */
export function verifyWritePin(submitted: string | null | undefined): boolean {
  const expected = process.env.SALLY_WRITE_PIN;
  if (!expected) {
    // Dev fallback — set SALLY_WRITE_PIN in production
    return submitted === "sally";
  }
  const a = Buffer.from(submitted ?? "");
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function requireWritePin(request: Request): Response | null {
  const pin = request.headers.get("x-write-pin");
  if (!verifyWritePin(pin)) {
    return Response.json(
      { error: "Invalid PIN. Enter the group PIN to save." },
      { status: 401 },
    );
  }
  return null;
}
