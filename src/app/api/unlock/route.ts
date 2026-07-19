import { NextResponse } from "next/server";
import { verifyAdminPin, verifyWritePin } from "@/lib/pin-server";
import { readJsonBody } from "@/lib/validate";

export async function POST(request: Request) {
  const parsed = await readJsonBody<{ pin?: string; kind?: string }>(request);
  if (!parsed.ok) return parsed.response;

  const pin = String(parsed.body.pin ?? "");
  const kind = parsed.body.kind === "admin" ? "admin" : "write";

  const ok = kind === "admin" ? verifyAdminPin(pin) : verifyWritePin(pin);
  if (!ok) {
    return NextResponse.json(
      {
        error:
          kind === "admin"
            ? "Wrong administrator password."
            : "Wrong group PIN.",
      },
      { status: 401 },
    );
  }
  return NextResponse.json({ ok: true, kind });
}
