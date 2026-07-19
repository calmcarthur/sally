const WRITE_PIN_KEY = "sally_write_pin";
const ADMIN_PIN_KEY = "sally_admin_pin";

export type PinKind = "write" | "admin";

export function getStoredPin(kind: PinKind = "write"): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(kind === "admin" ? ADMIN_PIN_KEY : WRITE_PIN_KEY);
}

export function storePin(pin: string, kind: PinKind = "write") {
  localStorage.setItem(kind === "admin" ? ADMIN_PIN_KEY : WRITE_PIN_KEY, pin);
}

export function clearStoredPin(kind: PinKind = "write") {
  localStorage.removeItem(kind === "admin" ? ADMIN_PIN_KEY : WRITE_PIN_KEY);
}
