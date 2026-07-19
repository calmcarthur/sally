import { NextResponse } from "next/server";
import { getAllLogs, listAllPrs, listPeople } from "@/lib/db";
import { buildLeaderboards, computeAllStats } from "@/lib/stats";
import { PRAISE, ROASTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year =
    yearParam === "lifetime" || yearParam === "all"
      ? null
      : Number(yearParam ?? new Date().getFullYear());

  const [people, logs, prs] = await Promise.all([
    listPeople(),
    getAllLogs(),
    listAllPrs(),
  ]);

  const stats = computeAllStats(people, logs, prs, year);
  const leaderboards = buildLeaderboards(stats);
  const quip =
    Math.random() > 0.5
      ? ROASTS[Math.floor(Math.random() * ROASTS.length)]
      : PRAISE[Math.floor(Math.random() * PRAISE.length)];

  return NextResponse.json({
    year: year ?? "lifetime",
    stats,
    leaderboards,
    quip,
  });
}
