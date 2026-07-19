import { NextResponse } from "next/server";
import { deletePr, listAllPrs, listPeople, upsertPr } from "@/lib/db";
import { EXERCISES } from "@/lib/constants";
import { computeRecordHolders } from "@/lib/prs";
import { requireWritePin } from "@/lib/pin";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const [people, prs] = await Promise.all([listPeople(), listAllPrs()]);
  const holders = computeRecordHolders(prs);
  return NextResponse.json({
    people,
    prs,
    holders,
    exercises: EXERCISES,
    today: todayISO(),
  });
}

export async function POST(request: Request) {
  const denied = requireWritePin(request);
  if (denied) return denied;

  const body = await request.json();
  const personId = String(body.personId ?? "");
  const exerciseKey = String(body.exerciseKey ?? "");
  const value = String(body.value ?? "").trim();
  const recordedOn = String(body.recordedOn ?? todayISO());

  if (!personId || !exerciseKey || !value) {
    return NextResponse.json(
      { error: "personId, exerciseKey, and value are required." },
      { status: 400 },
    );
  }

  if (body.clear) {
    await deletePr(personId, exerciseKey);
  } else {
    await upsertPr({ personId, exerciseKey, value, recordedOn });
  }

  const [people, prs] = await Promise.all([listPeople(), listAllPrs()]);
  const holders = computeRecordHolders(prs);
  return NextResponse.json({ people, prs, holders, exercises: EXERCISES });
}
