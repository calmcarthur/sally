import { NextResponse } from "next/server";
import { ensureSchema, listPeople } from "@/lib/db";
import { todayISO } from "@/lib/dates";
import { getAppTimeZone } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** Lightweight readiness check for deploy / uptime monitoring. */
export async function GET() {
  try {
    await ensureSchema();
    const people = await listPeople();
    return NextResponse.json({
      ok: true,
      today: todayISO(),
      timezone: getAppTimeZone(),
      activePeople: people.length,
      hasTurso: Boolean(
        process.env.TURSO_DATABASE_URL?.trim().startsWith("libsql:"),
      ),
      writePinConfigured: Boolean(process.env.SALLY_WRITE_PIN),
      adminPinConfigured: Boolean(process.env.SALLY_ADMIN_PIN),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Health check failed";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
