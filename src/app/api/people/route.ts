import { NextResponse } from "next/server";
import {
  createPerson,
  deactivatePerson,
  listAllPeople,
  listPeople,
  updatePersonJoinDate,
} from "@/lib/db";
import { requireAdminPin } from "@/lib/pin-server";
import { todayISO } from "@/lib/dates";
import { isValidISODate, readJsonBody } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1";

  if (all) {
    const denied = requireAdminPin(request);
    if (denied) return denied;
    const people = await listAllPeople();
    return NextResponse.json({ people });
  }

  const people = await listPeople();
  return NextResponse.json({ people });
}

export async function POST(request: Request) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  const parsed = await readJsonBody<{
    name?: string;
    code?: string;
    joinDate?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;

  const name = String(parsed.body.name ?? "").trim();
  const code = String(parsed.body.code ?? "").trim();
  const joinDate = String(parsed.body.joinDate ?? todayISO()).trim();

  if (!name || !code) {
    return NextResponse.json(
      { error: "Name and code are required." },
      { status: 400 },
    );
  }
  if (!isValidISODate(joinDate)) {
    return NextResponse.json(
      { error: "joinDate must be YYYY-MM-DD." },
      { status: 400 },
    );
  }

  try {
    const { person, restored, autoBlockout } = await createPerson(
      name,
      code,
      joinDate,
    );
    const people = await listAllPeople();
    return NextResponse.json({ person, people, restored, autoBlockout });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add person";
    if (message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "That identity code is already on the board." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  const parsed = await readJsonBody<{
    id?: string;
    joinDate?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;

  const id = String(parsed.body.id ?? "").trim();
  const joinDate = String(parsed.body.joinDate ?? "").trim();

  if (!id || !joinDate) {
    return NextResponse.json(
      { error: "id and joinDate are required." },
      { status: 400 },
    );
  }
  if (!isValidISODate(joinDate)) {
    return NextResponse.json(
      { error: "joinDate must be YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const person = await updatePersonJoinDate(id, joinDate);
  if (!person) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  const people = await listAllPeople();
  return NextResponse.json({ person, people });
}

export async function DELETE(request: Request) {
  const denied = requireAdminPin(request);
  if (denied) return denied;

  const parsed = await readJsonBody<{ id?: string }>(request);
  if (!parsed.ok) return parsed.response;

  const id = String(parsed.body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const active = await listPeople();
  if (active.length <= 1 && active.some((p) => p.id === id)) {
    return NextResponse.json(
      { error: "Can't remove the last person on the board." },
      { status: 400 },
    );
  }

  const ok = await deactivatePerson(id);
  if (!ok) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  const people = await listAllPeople();
  return NextResponse.json({ people });
}
