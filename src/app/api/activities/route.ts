import { NextResponse } from "next/server";
import {
  getActiveDatesDesc,
  getBlockoutsForMonth,
  getLogForDay,
  getLogsForMonth,
  getPersonById,
  isPersonDateBlocked,
  listBlockoutsForPerson,
  listPeople,
  upsertActivityLog,
} from "@/lib/db";
import { blockoutDateSet } from "@/lib/blockouts";
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
  const [monthLogs, monthBlockouts] = await Promise.all([
    getLogsForMonth(year, month),
    getBlockoutsForMonth(year, month),
  ]);
  const today = todayISO();
  // Enough history for any realistic current streak without loading the full table
  const since = addDaysISO(today, -400);

  const streakByPerson = new Map<string, number>();
  await Promise.all(
    people.map(async (p) => {
      const [dates, personBlockouts] = await Promise.all([
        getActiveDatesDesc(p.id, since),
        listBlockoutsForPerson(p.id),
      ]);
      const blocked = blockoutDateSet(personBlockouts);
      const active = dates.filter((d) => !blocked.has(d));
      streakByPerson.set(
        p.id,
        currentStreakFromDates(active, today, blocked),
      );
    }),
  );

  const rows = buildMonthRows(
    people,
    monthLogs,
    year,
    month,
    streakByPerson,
    monthBlockouts,
  );

  return NextResponse.json({
    year,
    month,
    people,
    rows,
    today,
    blockouts: monthBlockouts,
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
  // Allow today+1 so timezone skew doesn't block evening logging
  const maxLogDate = addDaysISO(today, 1);
  if (date > maxLogDate) {
    return NextResponse.json(
      { error: "Cannot log more than one day ahead." },
      { status: 400 },
    );
  }
  if (date < person.joinDate) {
    return NextResponse.json(
      { error: `Cannot log before join date (${person.joinDate}).` },
      { status: 400 },
    );
  }

  if (await isPersonDateBlocked(personId, date)) {
    return NextResponse.json(
      { error: "That day is blocked. Unblock it before logging." },
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
  const [log, blocked] = await Promise.all([
    getLogForDay(personId, date),
    isPersonDateBlocked(personId, date),
  ]);
  return NextResponse.json({ log, blocked });
}
