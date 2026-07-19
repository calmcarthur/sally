import { timingSafeEqual } from "crypto";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function safeEqual(submitted: string | null | undefined, expected: string): boolean {
  const a = Buffer.from(submitted ?? "");
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Group write PIN — log activities, edit PRs. */
export function verifyWritePin(submitted: string | null | undefined): boolean {
  const expected = process.env.SALLY_WRITE_PIN;
  if (!expected) {
    if (isProduction()) {
      console.error(
        "[sally] SALLY_WRITE_PIN is not set — writes are disabled in production.",
      );
      return false;
    }
    return submitted === "sally";
  }
  return safeEqual(submitted, expected);
}

/** Admin PIN — add / restore / remove people only. */
export function verifyAdminPin(submitted: string | null | undefined): boolean {
  const expected = process.env.SALLY_ADMIN_PIN;
  if (!expected) {
    if (isProduction()) {
      console.error(
        "[sally] SALLY_ADMIN_PIN is not set — people admin is disabled in production.",
      );
      return false;
    }
    return submitted === "sally-admin";
  }
  return safeEqual(submitted, expected);
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

export function requireAdminPin(request: Request): Response | null {
  const pin = request.headers.get("x-admin-pin");
  if (!verifyAdminPin(pin)) {
    return Response.json(
      {
        error: "Invalid admin password. Enter the administrator password.",
      },
      { status: 401 },
    );
  }
  return null;
}
