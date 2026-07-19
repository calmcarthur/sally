import { NextResponse } from "next/server";
import {
  getActiveDatesDesc,
  getLogForDay,
  getLogsForMonth,
  getPersonById,
  listPeople,
  upsertActivityLog,
} from "@/lib/db";
import { buildMonthRows } from "@/lib/month";
import { requireWritePin } from "@/lib/pin-server";
import { addDaysISO, todayISO } from "@/lib/dates";
import { currentStreakFromDates } from "@/lib/streaks";
import {
  isValidISODate,
  parseMonthParam,
  parseYearParam,
  readJsonBody,
  currentYearInTimeZone,
} from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nowYear = currentYearInTimeZone();
  const nowMonth = Number(
    new Intl.DateTimeFormat("en", {
      timeZone: process.env.SALLY_TIMEZONE?.trim() || "Europe/London",
      month: "numeric",
    }).format(new Date()),
  );

  const year = parseYearParam(searchParams.get("year"), nowYear);
  const month = parseMonthParam(searchParams.get("month"), nowMonth);
  if (year == null || month == null) {
    return NextResponse.json(
      { error: "Invalid year or month." },
      { status: 400 },
    );
  }

  const people = await listPeople();
  const monthLogs = await getLogsForMonth(year, month);
  const today = todayISO();
  // Enough history for any realistic current streak without loading the full table
  const since = addDaysISO(today, -400);

  const streakByPerson = new Map<string, number>();
  await Promise.all(
    people.map(async (p) => {
      const dates = await getActiveDatesDesc(p.id, since);
      streakByPerson.set(p.id, currentStreakFromDates(dates, today));
    }),
  );

  const rows = buildMonthRows(people, monthLogs, year, month, streakByPerson);

  return NextResponse.json({
    year,
    month,
    people,
    rows,
    today,
  });
}

export async function POST(request: Request) {
  const denied = requireWritePin(request);
  if (denied) return denied;

  const parsed = await readJsonBody<{
    personId?: string;
    date?: string;
    weightTraining?: boolean;
    cardio?: boolean;
    sport?: boolean;
    activeRecovery?: boolean;
  }>(request);
  if (!parsed.ok) return parsed.response;

  const personId = String(parsed.body.personId ?? "");
  const date = String(parsed.body.date ?? "");
  if (!personId || !date) {
    return NextResponse.json(
      { error: "personId and date are required." },
      { status: 400 },
    );
  }
  if (!isValidISODate(date)) {
    return NextResponse.json(
      { error: "date must be YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const person = await getPersonById(personId);
  if (!person || !person.active) {
    return NextResponse.json(
      { error: "Person not found or not on the board." },
      { status: 404 },
    );
  }

  const today = todayISO();
  if (date > today) {
    return NextResponse.json(
      { error: "Cannot log a future date." },
      { status: 400 },
    );
  }
  if (date < person.joinDate) {
    return NextResponse.json(
      { error: `Cannot log before join date (${person.joinDate}).` },
      { status: 400 },
    );
  }

  const log = await upsertActivityLog({
    personId,
    date,
    weightTraining: Boolean(parsed.body.weightTraining),
    cardio: Boolean(parsed.body.cardio),
    sport: Boolean(parsed.body.sport),
    activeRecovery: Boolean(parsed.body.activeRecovery),
  });

  return NextResponse.json({ log });
}

export async function PUT(request: Request) {
  const parsed = await readJsonBody<{ personId?: string; date?: string }>(
    request,
  );
  if (!parsed.ok) return parsed.response;

  const personId = String(parsed.body.personId ?? "");
  const date = String(parsed.body.date ?? "");
  if (!personId || !isValidISODate(date)) {
    return NextResponse.json(
      { error: "Valid personId and date are required." },
      { status: 400 },
    );
  }
  const log = await getLogForDay(personId, date);
  return NextResponse.json({ log });
}
