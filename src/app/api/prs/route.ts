import { NextResponse } from "next/server";
import {
  deletePr,
  getPersonById,
  listAllPrs,
  listPeople,
  upsertPr,
} from "@/lib/db";
import { EXERCISE_BY_KEY, EXERCISES } from "@/lib/constants";
import { computeRecordHolders, parseComparable } from "@/lib/prs";
import { requireWritePin } from "@/lib/pin-server";
import { todayISO } from "@/lib/dates";
import { isValidISODate, readJsonBody } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  const [people, prs] = await Promise.all([listPeople(), listAllPrs()]);
  const holders = computeRecordHolders(
    prs,
    people.map((p) => p.id),
  );
  const activeIds = new Set(people.map((p) => p.id));
  const visiblePrs = prs.filter((p) => activeIds.has(p.personId));
  return NextResponse.json({
    people,
    prs: visiblePrs,
    holders,
    exercises: EXERCISES,
    today: todayISO(),
  });
}

export async function POST(request: Request) {
  const denied = requireWritePin(request);
  if (denied) return denied;

  const parsed = await readJsonBody<{
    personId?: string;
    exerciseKey?: string;
    value?: string;
    recordedOn?: string;
    clear?: boolean;
  }>(request);
  if (!parsed.ok) return parsed.response;

  const personId = String(parsed.body.personId ?? "");
  const exerciseKey = String(parsed.body.exerciseKey ?? "");
  const value = String(parsed.body.value ?? "").trim();
  const recordedOn = String(parsed.body.recordedOn ?? todayISO());
  const clear = Boolean(parsed.body.clear);

  if (!personId || !exerciseKey) {
    return NextResponse.json(
      { error: "personId and exerciseKey are required." },
      { status: 400 },
    );
  }

  const exercise = EXERCISE_BY_KEY[exerciseKey];
  if (!exercise) {
    return NextResponse.json(
      { error: "Unknown exercise." },
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

  if (clear) {
    await deletePr(personId, exerciseKey);
  } else {
    if (!value) {
      return NextResponse.json(
        { error: "value is required (or pass clear: true)." },
        { status: 400 },
      );
    }
    if (!isValidISODate(recordedOn)) {
      return NextResponse.json(
        { error: "recordedOn must be YYYY-MM-DD." },
        { status: 400 },
      );
    }
    const today = todayISO();
    if (recordedOn > today) {
      return NextResponse.json(
        { error: "recordedOn cannot be in the future." },
        { status: 400 },
      );
    }
    if (parseComparable(exercise, value) === null) {
      return NextResponse.json(
        {
          error:
            "Could not parse value. Use a number, or time as m:ss / h:mm:ss.",
        },
        { status: 400 },
      );
    }
    await upsertPr({ personId, exerciseKey, value, recordedOn });
  }

  const [people, prs] = await Promise.all([listPeople(), listAllPrs()]);
  const holders = computeRecordHolders(
    prs,
    people.map((p) => p.id),
  );
  const activeIds = new Set(people.map((p) => p.id));
  return NextResponse.json({
    people,
    prs: prs.filter((p) => activeIds.has(p.personId)),
    holders,
    exercises: EXERCISES,
  });
}
