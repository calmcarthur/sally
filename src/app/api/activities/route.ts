import { NextResponse } from "next/server";
import {
  getAllLogs,
  getLogForDay,
  getLogsForMonth,
  listPeople,
  upsertActivityLog,
} from "@/lib/db";
import { buildMonthRows } from "@/lib/month";
import { requireWritePin } from "@/lib/pin";
import { todayISO } from "@/lib/dates";
import type { ActivityLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year") ?? now.getFullYear());
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

  const [people, monthLogs, allLogs] = await Promise.all([
    listPeople(),
    getLogsForMonth(year, month),
    getAllLogs(),
  ]);

  const byPerson = new Map<string, ActivityLog[]>();
  for (const log of allLogs) {
    const list = byPerson.get(log.personId) ?? [];
    list.push(log);
    byPerson.set(log.personId, list);
  }

  const rows = buildMonthRows(people, monthLogs, year, month, byPerson);

  return NextResponse.json({
    year,
    month,
    people,
    rows,
    today: todayISO(),
  });
}

export async function POST(request: Request) {
  const denied = requireWritePin(request);
  if (denied) return denied;

  const body = await request.json();
  const personId = String(body.personId ?? "");
  const date = String(body.date ?? "");
  if (!personId || !date) {
    return NextResponse.json(
      { error: "personId and date are required." },
      { status: 400 },
    );
  }

  const log = await upsertActivityLog({
    personId,
    date,
    weightTraining: Boolean(body.weightTraining),
    cardio: Boolean(body.cardio),
    sport: Boolean(body.sport),
    activeRecovery: Boolean(body.activeRecovery),
  });

  return NextResponse.json({ log });
}

export async function PUT(request: Request) {
  // Fetch a single day for prefilling
  const body = await request.json();
  const personId = String(body.personId ?? "");
  const date = String(body.date ?? "");
  const log = await getLogForDay(personId, date);
  return NextResponse.json({ log });
}
