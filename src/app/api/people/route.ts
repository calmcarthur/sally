import { NextResponse } from "next/server";
import { createPerson, listPeople } from "@/lib/db";
import { requireWritePin } from "@/lib/pin";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const people = await listPeople();
  return NextResponse.json({ people });
}

export async function POST(request: Request) {
  const denied = requireWritePin(request);
  if (denied) return denied;

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const code = String(body.code ?? "").trim();
  const joinDate = String(body.joinDate ?? todayISO()).trim();

  if (!name || !code) {
    return NextResponse.json(
      { error: "Name and code are required." },
      { status: 400 },
    );
  }

  try {
    const person = await createPerson(name, code, joinDate);
    const people = await listPeople();
    return NextResponse.json({ person, people });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add person";
    if (message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "That identity code is already taken." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
