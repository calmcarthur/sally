import { NextResponse } from "next/server";
import { getAllLogs, listAllBlockouts, listAllPrs, listPeople } from "@/lib/db";
import { buildLeaderboards, computeAllStats } from "@/lib/stats";
import { APP_START_YEAR } from "@/lib/constants";
import { currentYearInTimeZone } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const currentYear = currentYearInTimeZone();

  let year: number | null;
  if (yearParam === "lifetime" || yearParam === "all") {
    year = null;
  } else if (yearParam == null || yearParam === "") {
    year = currentYear;
  } else {
    const n = Number(yearParam);
    if (!Number.isInteger(n) || n < APP_START_YEAR || n > currentYear) {
      return NextResponse.json(
        { error: `year must be ${APP_START_YEAR}–${currentYear}, or lifetime.` },
        { status: 400 },
      );
    }
    year = n;
  }

  const [people, logs, prs, blockouts] = await Promise.all([
    listPeople(),
    getAllLogs(),
    listAllPrs(),
    listAllBlockouts(),
  ]);

  const stats = computeAllStats(people, logs, prs, year, blockouts);
  const leaderboards = buildLeaderboards(stats);

  return NextResponse.json({
    year: year ?? "lifetime",
    stats,
    leaderboards,
  });
}
