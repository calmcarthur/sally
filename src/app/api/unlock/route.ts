import { NextResponse } from "next/server";
import { verifyWritePin } from "@/lib/pin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const pin = String(body.pin ?? "");
  if (!verifyWritePin(pin)) {
    return NextResponse.json({ error: "Wrong PIN." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
