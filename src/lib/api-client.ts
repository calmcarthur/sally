import {
  getStoredPin,
  clearStoredPin,
  type PinKind,
} from "./pin-client";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ApiFetchOptions = RequestInit & {
  /** Which PIN header to send. Default: write. */
  pinKind?: PinKind;
};

export async function apiFetch<T>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { pinKind = "write", ...init } = options;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const pin = getStoredPin(pinKind);
  if (pin) {
    headers.set(pinKind === "admin" ? "x-admin-pin" : "x-write-pin", pin);
  }

  const res = await fetch(url, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) clearStoredPin(pinKind);
    throw new ApiError(
      typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status})`,
      res.status,
    );
  }
  return data as T;
}
