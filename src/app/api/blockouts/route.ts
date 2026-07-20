import { NextResponse } from "next/server";
import {
  createBlockout,
  deleteBlockout,
  getBlockoutById,
  getPersonById,
  listBlockoutsForPerson,
  unblockDay,
} from "@/lib/db";
import { requireWritePin } from "@/lib/pin-server";
import { isValidISODate, readJsonBody } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const personId = searchParams.get("personId")?.trim() ?? "";
  if (!personId) {
    return NextResponse.json(
      { error: "personId is required." },
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
  const blockouts = await listBlockoutsForPerson(personId);
  return NextResponse.json({ blockouts });
}

export async function POST(request: Request) {
  const denied = requireWritePin(request);
  if (denied) return denied;

  const parsed = await readJsonBody<{
    personId?: string;
    startDate?: string;
    endDate?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;

  const personId = String(parsed.body.personId ?? "").trim();
  const startDate = String(parsed.body.startDate ?? "").trim();
  const endDate = String(parsed.body.endDate ?? "").trim();

  if (!personId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "personId, startDate, and endDate are required." },
      { status: 400 },
    );
  }
  if (!isValidISODate(startDate) || !isValidISODate(endDate)) {
    return NextResponse.json(
      { error: "Dates must be YYYY-MM-DD." },
      { status: 400 },
    );
  }
  if (endDate < startDate) {
    return NextResponse.json(
      { error: "endDate must be on or after startDate." },
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
  if (endDate < person.joinDate) {
    return NextResponse.json(
      { error: `Cannot block before join date (${person.joinDate}).` },
      { status: 400 },
    );
  }

  const blockout = await createBlockout(personId, startDate, endDate);
  const blockouts = await listBlockoutsForPerson(personId);
  return NextResponse.json({ blockout, blockouts });
}

export async function DELETE(request: Request) {
  const denied = requireWritePin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  const personId = searchParams.get("personId")?.trim() ?? "";
  const date = searchParams.get("date")?.trim() ?? "";

  // Unblock a single day (split ranges)
  if (personId && date) {
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
    const modified = await unblockDay(personId, date);
    if (modified === 0) {
      return NextResponse.json(
        { error: "That day is not blocked." },
        { status: 404 },
      );
    }
    const blockouts = await listBlockoutsForPerson(personId);
    return NextResponse.json({ blockouts });
  }

  if (!id) {
    return NextResponse.json(
      { error: "id, or personId+date, is required." },
      { status: 400 },
    );
  }

  const existing = await getBlockoutById(id);
  if (!existing) {
    return NextResponse.json(
      { error: "Blockout not found." },
      { status: 404 },
    );
  }
  await deleteBlockout(id);
  const blockouts = await listBlockoutsForPerson(existing.personId);
  return NextResponse.json({ blockouts });
}
