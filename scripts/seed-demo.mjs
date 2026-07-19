/**
 * Wipe local DB and load demo data for all 7 people (2025–2026).
 * Arya, Bilal, Cal, Jasper, Logan, Martin, Sebastian.
 * Usage: npm run db:seed
 */
import { createClient } from "@libsql/client";
import { mkdirSync, rmSync } from "fs";
import path from "path";
import { nanoid } from "nanoid";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "sally.db");

rmSync(dataDir, { recursive: true, force: true });
mkdirSync(dataDir, { recursive: true });

const db = createClient({ url: `file:${dbPath}` });

await db.batch(
  [
    `CREATE TABLE people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      join_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE activity_logs (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id),
      date TEXT NOT NULL,
      weight_training INTEGER NOT NULL DEFAULT 0,
      cardio INTEGER NOT NULL DEFAULT 0,
      sport INTEGER NOT NULL DEFAULT 0,
      active_recovery INTEGER NOT NULL DEFAULT 0,
      UNIQUE(person_id, date)
    )`,
    `CREATE TABLE personal_records (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id),
      exercise_key TEXT NOT NULL,
      value TEXT NOT NULL,
      recorded_on TEXT NOT NULL,
      UNIQUE(person_id, exercise_key)
    )`,
  ],
  "write",
);

const PEOPLE = [
  { name: "Arya", code: "AM001", joinDate: "2025-01-01", profile: "balanced" },
  { name: "Bilal", code: "BA002", joinDate: "2025-01-01", profile: "cardio" },
  { name: "Cal", code: "CM003", joinDate: "2025-01-01", profile: "meathead" },
  { name: "Jasper", code: "JC004", joinDate: "2025-06-15", profile: "sport" },
  { name: "Logan", code: "LL005", joinDate: "2025-01-01", profile: "consistent" },
  { name: "Martin", code: "MG006", joinDate: "2025-01-01", profile: "consistent" },
  { name: "Sebastian", code: "SM007", joinDate: "2025-03-01", profile: "casual" },
];

const createdAt = new Date().toISOString();
const ids = {};

for (const p of PEOPLE) {
  const id = nanoid();
  ids[p.code] = id;
  await db.execute({
    sql: `INSERT INTO people (id, name, code, join_date, created_at, active) VALUES (?, ?, ?, ?, ?, 1)`,
    args: [id, p.name, p.code, p.joinDate, createdAt],
  });
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function iso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function eachDay(start, end) {
  const out = [];
  const cur = new Date(start);
  cur.setHours(12, 0, 0, 0);
  const last = new Date(end);
  last.setHours(12, 0, 0, 0);
  while (cur <= last) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Profile → probability of logging + type weights */
function dayFlags(profile, dateStr, dow) {
  const h = hash(`${profile}:${dateStr}`);
  const r = (h % 1000) / 1000;

  // Skip rate by profile (higher = more rest days)
  const skip =
    profile === "consistent" ? 0.18 :
    profile === "meathead" ? 0.28 :
    profile === "cardio" ? 0.32 :
    profile === "balanced" ? 0.3 :
    profile === "casual" ? 0.48 :
    0.35; // sport

  if (r < skip) return null;

  // Weekend lean toward sport / AR
  const weekend = dow === 0 || dow === 6;
  const r2 = ((h >> 3) % 1000) / 1000;
  const r3 = ((h >> 7) % 1000) / 1000;
  const r4 = ((h >> 11) % 1000) / 1000;

  let wt = false, cardio = false, sport = false, ar = false;

  if (profile === "meathead") {
    wt = !weekend || r2 > 0.55;
    cardio = r3 > 0.72;
    sport = weekend && r2 > 0.4;
    ar = r4 > 0.85;
  } else if (profile === "consistent") {
    wt = r2 > 0.35;
    cardio = r3 > 0.45;
    sport = weekend || r2 > 0.75;
    ar = r4 > 0.7;
  } else if (profile === "cardio") {
    cardio = true;
    wt = r2 > 0.7;
    sport = weekend && r3 > 0.5;
    ar = r4 > 0.8;
  } else if (profile === "balanced") {
    wt = r2 > 0.4;
    cardio = r3 > 0.45;
    sport = weekend || r2 > 0.7;
    ar = r4 > 0.78;
  } else if (profile === "casual") {
    wt = r2 > 0.55;
    cardio = r3 > 0.5;
    sport = weekend && r2 > 0.35;
    ar = r4 > 0.65;
  } else {
    // sport
    sport = weekend || r2 > 0.4;
    wt = r3 > 0.65;
    cardio = r2 > 0.55;
    ar = r4 > 0.75;
  }

  if (!wt && !cardio && !sport && !ar) {
    if (profile === "cardio") cardio = true;
    else if (profile === "sport") sport = true;
    else wt = true;
  }

  return { wt, cardio, sport, ar };
}

const start2025 = new Date(2025, 0, 1);
const end2025 = new Date(2025, 11, 31);
const start2026 = new Date(2026, 0, 1);
const end2026 = new Date(2026, 6, 19); // through "today" in the project timeline

let logCount = 0;

for (const p of PEOPLE) {
  const join = new Date(p.joinDate + "T12:00:00");
  const days = [
    ...eachDay(start2025, end2025),
    ...eachDay(start2026, end2026),
  ].filter((d) => d >= join);

  // Give Martin a solid recent streak ending Jul 19 2026
  const streakStart = new Date(2026, 6, 10); // Jul 10–19
  const streakEnd = new Date(2026, 6, 19);

  for (const d of days) {
    const dateStr = iso(d);
    let flags;

    if (p.code === "MG006" && d >= streakStart && d <= streakEnd) {
      flags = { wt: true, cardio: d.getDate() % 2 === 0, sport: false, ar: false };
    } else if (p.code === "CM003" && d >= new Date(2026, 6, 15) && d <= streakEnd) {
      flags = { wt: true, cardio: false, sport: false, ar: false };
    } else {
      flags = dayFlags(p.profile, dateStr, d.getDay());
    }

    if (!flags) continue;

    await db.execute({
      sql: `INSERT INTO activity_logs (
        id, person_id, date, weight_training, cardio, sport, active_recovery
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        nanoid(),
        ids[p.code],
        dateStr,
        flags.wt ? 1 : 0,
        flags.cardio ? 1 : 0,
        flags.sport ? 1 : 0,
        flags.ar ? 1 : 0,
      ],
    });
    logCount += 1;
  }
}

const prs = [
  // Cal — strong lifts
  ["CM003", "bench", "225", "2025-08-12"],
  ["CM003", "deadlift", "405", "2025-11-02"],
  ["CM003", "squat", "315", "2026-03-14"],
  ["CM003", "press", "145", "2025-09-20"],
  ["CM003", "pullups", "18", "2026-01-08"],
  ["CM003", "5k", "22:40", "2025-10-05"],
  // Martin — balanced / endurance
  ["MG006", "bench", "185", "2025-07-01"],
  ["MG006", "deadlift", "315", "2026-02-11"],
  ["MG006", "squat", "275", "2025-12-01"],
  ["MG006", "pullups", "22", "2026-04-02"],
  ["MG006", "plank", "4:12", "2026-05-18"],
  ["MG006", "5k", "19:55", "2026-06-21"],
  ["MG006", "10k", "42:10", "2025-09-14"],
  ["MG006", "1mile", "5:48", "2026-03-03"],
  // Bilal — cardio / running
  ["BA002", "bench", "155", "2025-06-10"],
  ["BA002", "pullups", "15", "2025-08-22"],
  ["BA002", "40yd", "4.92", "2025-07-19"],
  ["BA002", "5k", "18:20", "2026-05-01"],
  ["BA002", "10k", "39:05", "2026-06-12"],
  ["BA002", "half", "1:28:40", "2025-11-16"],
  ["BA002", "1mile", "5:22", "2026-02-28"],
  // Jasper — sport / calisthenics (joined mid-2025)
  ["JC004", "bench", "175", "2025-09-01"],
  ["JC004", "pullups", "25", "2026-01-20"],
  ["JC004", "pushups", "80", "2025-10-11"],
  ["JC004", "dips", "30", "2026-04-09"],
  ["JC004", "deadhang", "95", "2025-12-20"],
  ["JC004", "100m", "12.4", "2026-03-15"],
  ["JC004", "5k", "21:05", "2026-07-01"],
  // Arya
  ["AM001", "bench", "165", "2025-09-12"],
  ["AM001", "squat", "245", "2026-02-01"],
  ["AM001", "pullups", "12", "2025-11-20"],
  ["AM001", "5k", "23:10", "2026-04-18"],
  // Logan
  ["LL005", "bench", "205", "2026-01-15"],
  ["LL005", "deadlift", "365", "2025-10-08"],
  ["LL005", "pullups", "20", "2026-03-22"],
  ["LL005", "plank", "3:45", "2026-05-02"],
  ["LL005", "5k", "20:40", "2026-06-01"],
  // Sebastian (joined Mar 2025)
  ["SM007", "bench", "135", "2025-08-01"],
  ["SM007", "pushups", "55", "2026-02-14"],
  ["SM007", "5k", "24:30", "2026-05-20"],
  ["SM007", "dips", "18", "2026-03-11"],
];

for (const [code, exercise, value, recordedOn] of prs) {
  await db.execute({
    sql: `INSERT INTO personal_records (id, person_id, exercise_key, value, recorded_on)
      VALUES (?, ?, ?, ?, ?)`,
    args: [nanoid(), ids[code], exercise, value, recordedOn],
  });
}

console.log(`Seeded ${PEOPLE.length} people, ${logCount} activity days, ${prs.length} PRs.`);
console.log(`DB: ${dbPath}`);
console.log("Restart the dev server if it was running (or just refresh).");
