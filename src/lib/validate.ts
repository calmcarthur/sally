/** Shared calendar timezone for "today", streaks, and eligible days. */
export function getAppTimeZone(): string {
  return process.env.SALLY_TIMEZONE?.trim() || "Europe/London";
}

/** YYYY-MM-DD in the app timezone (not the server's local TZ). */
export function todayInTimeZone(timeZone: string = getAppTimeZone()): string {
  // en-CA yields ISO-like YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function currentYearInTimeZone(
  timeZone: string = getAppTimeZone(),
): number {
  return Number(
    new Intl.DateTimeFormat("en", {
      timeZone,
      year: "numeric",
    }).format(new Date()),
  );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function parseYearParam(
  raw: string | null,
  fallback: number,
): number | null {
  if (raw == null || raw === "" || raw === "lifetime" || raw === "all") {
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1970 || n > 2100) return null;
  return n;
}

export function parseMonthParam(raw: string | null, fallback: number): number | null {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 12) return null;
  return n;
}

export async function readJsonBody<T = Record<string, unknown>>(
  request: Request,
): Promise<{ ok: true; body: T } | { ok: false; response: Response }> {
  try {
    const body = (await request.json()) as T;
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }
}
