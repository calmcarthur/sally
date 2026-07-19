import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { SEED_PEOPLE } from "./constants";
import { todayISO } from "./dates";
import type { ActivityLog, Person, PersonalRecord } from "./types";

let client: Client | null = null;
let initialized = false;

function getDbUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return `file:${path.join(dir, "sally.db")}`;
}

export function getDb(): Client {
  if (!client) {
    client = createClient({
      url: getDbUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function ensureSchema() {
  if (initialized) return;
  const db = getDb();

  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS people (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        join_date TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL REFERENCES people(id),
        date TEXT NOT NULL,
        weight_training INTEGER NOT NULL DEFAULT 0,
        cardio INTEGER NOT NULL DEFAULT 0,
        sport INTEGER NOT NULL DEFAULT 0,
        active_recovery INTEGER NOT NULL DEFAULT 0,
        UNIQUE(person_id, date)
      )`,
      `CREATE TABLE IF NOT EXISTS personal_records (
        id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL REFERENCES people(id),
        exercise_key TEXT NOT NULL,
        value TEXT NOT NULL,
        recorded_on TEXT NOT NULL,
        UNIQUE(person_id, exercise_key)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_logs_person_date ON activity_logs(person_id, date)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_date ON activity_logs(date)`,
      `CREATE INDEX IF NOT EXISTS idx_prs_exercise ON personal_records(exercise_key)`,
    ],
    "write",
  );

  const count = await db.execute("SELECT COUNT(*) AS c FROM people");
  const n = Number(count.rows[0]?.c ?? 0);
  if (n === 0) {
    const joinDate = `${new Date().getFullYear()}-01-01`;
    const createdAt = new Date().toISOString();
    for (const p of SEED_PEOPLE) {
      await db.execute({
        sql: `INSERT INTO people (id, name, code, join_date, created_at) VALUES (?, ?, ?, ?, ?)`,
        args: [nanoid(), p.name, p.code, joinDate, createdAt],
      });
    }
  }

  initialized = true;
}

function mapPerson(row: Record<string, unknown>): Person {
  return {
    id: String(row.id),
    name: String(row.name),
    code: String(row.code),
    joinDate: String(row.join_date),
    createdAt: String(row.created_at),
  };
}

function mapLog(row: Record<string, unknown>): ActivityLog {
  return {
    id: String(row.id),
    personId: String(row.person_id),
    date: String(row.date),
    weightTraining: Boolean(row.weight_training),
    cardio: Boolean(row.cardio),
    sport: Boolean(row.sport),
    activeRecovery: Boolean(row.active_recovery),
  };
}

function mapPr(row: Record<string, unknown>): PersonalRecord {
  return {
    id: String(row.id),
    personId: String(row.person_id),
    exerciseKey: String(row.exercise_key),
    value: String(row.value),
    recordedOn: String(row.recorded_on),
  };
}

export async function listPeople(): Promise<Person[]> {
  await ensureSchema();
  const res = await getDb().execute(
    "SELECT * FROM people ORDER BY created_at ASC",
  );
  return res.rows.map((r) => mapPerson(r as Record<string, unknown>));
}

export async function createPerson(
  name: string,
  code: string,
  joinDate: string,
): Promise<Person> {
  await ensureSchema();
  const person: Person = {
    id: nanoid(),
    name: name.trim(),
    code: code.trim().toUpperCase(),
    joinDate,
    createdAt: new Date().toISOString(),
  };
  await getDb().execute({
    sql: `INSERT INTO people (id, name, code, join_date, created_at) VALUES (?, ?, ?, ?, ?)`,
    args: [person.id, person.name, person.code, person.joinDate, person.createdAt],
  });
  return person;
}

export async function getLogsForMonth(
  year: number,
  month: number,
): Promise<ActivityLog[]> {
  await ensureSchema();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
  const res = await getDb().execute({
    sql: `SELECT * FROM activity_logs WHERE date >= ? AND date < ?`,
    args: [start, end],
  });
  return res.rows.map((r) => mapLog(r as Record<string, unknown>));
}

export async function getLogsForPerson(personId: string): Promise<ActivityLog[]> {
  await ensureSchema();
  const res = await getDb().execute({
    sql: `SELECT * FROM activity_logs WHERE person_id = ? ORDER BY date ASC`,
    args: [personId],
  });
  return res.rows.map((r) => mapLog(r as Record<string, unknown>));
}

export async function getAllLogs(): Promise<ActivityLog[]> {
  await ensureSchema();
  const res = await getDb().execute(
    `SELECT * FROM activity_logs ORDER BY date ASC`,
  );
  return res.rows.map((r) => mapLog(r as Record<string, unknown>));
}

export async function getLogsInRange(
  start: string,
  end: string,
): Promise<ActivityLog[]> {
  await ensureSchema();
  const res = await getDb().execute({
    sql: `SELECT * FROM activity_logs WHERE date >= ? AND date <= ?`,
    args: [start, end],
  });
  return res.rows.map((r) => mapLog(r as Record<string, unknown>));
}

export async function upsertActivityLog(input: {
  personId: string;
  date: string;
  weightTraining: boolean;
  cardio: boolean;
  sport: boolean;
  activeRecovery: boolean;
}): Promise<ActivityLog> {
  await ensureSchema();
  const any =
    input.weightTraining ||
    input.cardio ||
    input.sport ||
    input.activeRecovery;

  if (!any) {
    await getDb().execute({
      sql: `DELETE FROM activity_logs WHERE person_id = ? AND date = ?`,
      args: [input.personId, input.date],
    });
    return {
      id: "",
      personId: input.personId,
      date: input.date,
      weightTraining: false,
      cardio: false,
      sport: false,
      activeRecovery: false,
    };
  }

  const existing = await getDb().execute({
    sql: `SELECT id FROM activity_logs WHERE person_id = ? AND date = ?`,
    args: [input.personId, input.date],
  });

  const id =
    existing.rows[0] != null
      ? String(existing.rows[0].id)
      : nanoid();

  await getDb().execute({
    sql: `INSERT INTO activity_logs (
      id, person_id, date, weight_training, cardio, sport, active_recovery
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(person_id, date) DO UPDATE SET
      weight_training = excluded.weight_training,
      cardio = excluded.cardio,
      sport = excluded.sport,
      active_recovery = excluded.active_recovery`,
    args: [
      id,
      input.personId,
      input.date,
      input.weightTraining ? 1 : 0,
      input.cardio ? 1 : 0,
      input.sport ? 1 : 0,
      input.activeRecovery ? 1 : 0,
    ],
  });

  return {
    id,
    personId: input.personId,
    date: input.date,
    weightTraining: input.weightTraining,
    cardio: input.cardio,
    sport: input.sport,
    activeRecovery: input.activeRecovery,
  };
}

export async function getLogForDay(
  personId: string,
  date: string,
): Promise<ActivityLog | null> {
  await ensureSchema();
  const res = await getDb().execute({
    sql: `SELECT * FROM activity_logs WHERE person_id = ? AND date = ?`,
    args: [personId, date],
  });
  if (!res.rows[0]) return null;
  return mapLog(res.rows[0] as Record<string, unknown>);
}

export async function listAllPrs(): Promise<PersonalRecord[]> {
  await ensureSchema();
  const res = await getDb().execute(`SELECT * FROM personal_records`);
  return res.rows.map((r) => mapPr(r as Record<string, unknown>));
}

export async function upsertPr(input: {
  personId: string;
  exerciseKey: string;
  value: string;
  recordedOn: string;
}): Promise<PersonalRecord> {
  await ensureSchema();
  const existing = await getDb().execute({
    sql: `SELECT id FROM personal_records WHERE person_id = ? AND exercise_key = ?`,
    args: [input.personId, input.exerciseKey],
  });
  const id =
    existing.rows[0] != null ? String(existing.rows[0].id) : nanoid();

  await getDb().execute({
    sql: `INSERT INTO personal_records (id, person_id, exercise_key, value, recorded_on)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(person_id, exercise_key) DO UPDATE SET
        value = excluded.value,
        recorded_on = excluded.recorded_on`,
    args: [id, input.personId, input.exerciseKey, input.value, input.recordedOn],
  });

  return {
    id,
    personId: input.personId,
    exerciseKey: input.exerciseKey,
    value: input.value,
    recordedOn: input.recordedOn,
  };
}

export async function deletePr(personId: string, exerciseKey: string) {
  await ensureSchema();
  await getDb().execute({
    sql: `DELETE FROM personal_records WHERE person_id = ? AND exercise_key = ?`,
    args: [personId, exerciseKey],
  });
}

/** Used only for seed/demo — expose today for join defaults */
export { todayISO };
