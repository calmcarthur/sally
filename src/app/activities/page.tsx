"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { ActivityKey } from "@/lib/constants";
import type { Person, PersonMonthRow } from "@/lib/types";
import { BlockOutPanel } from "@/components/BlockOutPanel";
import { LogPanel } from "@/components/LogPanel";
import { MonthGrid } from "@/components/MonthGrid";
import { PeopleAdmin } from "@/components/PeopleAdmin";
import { Toast } from "@/components/Toast";
import { useWriteGate } from "@/components/useWriteGate";

type Flags = Record<ActivityKey, boolean>;

const emptyFlags = (): Flags => ({
  weightTraining: false,
  cardio: false,
  sport: false,
  activeRecovery: false,
});

export default function ActivitiesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [people, setPeople] = useState<Person[]>([]);
  const [rows, setRows] = useState<PersonMonthRow[]>([]);
  const [today, setToday] = useState("");
  const [personId, setPersonId] = useState("");
  const [date, setDate] = useState("");
  const [flags, setFlags] = useState<Flags>(emptyFlags);
  const [dayBlocked, setDayBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unblocking, setUnblocking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const undoRef = useRef<{
    personId: string;
    date: string;
    flags: Flags;
  } | null>(null);
  const adminClicks = useRef(0);
  const adminTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const { withWriteAccess, gate } = useWriteGate();

  function onActivitiesTitleClick(_e: MouseEvent) {
    adminClicks.current += 1;
    if (adminTimer.current) clearTimeout(adminTimer.current);
    if (adminClicks.current >= 5) {
      adminClicks.current = 0;
      setAdminOpen(true);
      return;
    }
    adminTimer.current = setTimeout(() => {
      adminClicks.current = 0;
    }, 1200);
  }

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        people: Person[];
        rows: PersonMonthRow[];
        today: string;
      }>(`/api/activities?year=${y}&month=${m}`);
      setPeople(data.people);
      setRows(data.rows);
      setToday(data.today);
      setPersonId((prev) =>
        data.people.some((p) => p.id === prev)
          ? prev
          : data.people[0]?.id || "",
      );
      setDate((prev) => prev || data.today);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(year, month);
  }, [year, month, load]);

  useEffect(() => {
    const onChange = () => void load(year, month);
    window.addEventListener("sally:people-changed", onChange);
    return () => window.removeEventListener("sally:people-changed", onChange);
  }, [year, month, load]);

  async function loadDayFlags(pid: string, d: string) {
    try {
      const res = await fetch("/api/activities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: pid, date: d }),
      });
      const data = await res.json();
      setDayBlocked(Boolean(data.blocked));
      if (data.log && !data.blocked) {
        setFlags({
          weightTraining: Boolean(data.log.weightTraining),
          cardio: Boolean(data.log.cardio),
          sport: Boolean(data.log.sport),
          activeRecovery: Boolean(data.log.activeRecovery),
        });
      } else {
        setFlags(emptyFlags());
      }
    } catch {
      setDayBlocked(false);
      setFlags(emptyFlags());
    }
  }

  function handleSelectDay(pid: string, d: string) {
    setPersonId(pid);
    setDate(d);
    void loadDayFlags(pid, d);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePersonChange(id: string) {
    setPersonId(id);
    if (date) void loadDayFlags(id, date);
  }

  function handleDateChange(d: string) {
    setDate(d);
    if (personId) void loadDayFlags(personId, d);
  }

  async function doSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/activities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, date }),
      });
      const prev = await res.json();
      undoRef.current = {
        personId,
        date,
        flags: prev.log
          ? {
              weightTraining: Boolean(prev.log.weightTraining),
              cardio: Boolean(prev.log.cardio),
              sport: Boolean(prev.log.sport),
              activeRecovery: Boolean(prev.log.activeRecovery),
            }
          : emptyFlags(),
      };

      await apiFetch("/api/activities", {
        method: "POST",
        body: JSON.stringify({
          personId,
          date,
          ...flags,
        }),
      });
      setCanUndo(true);
      setToast("saved");
      await load(year, month);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setToast("PIN required — unlock and try again.");
        void withWriteAccess(doSave);
      } else {
        setToast(e instanceof Error ? e.message : "Save failed");
        setCanUndo(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    void withWriteAccess(doSave);
  }

  async function handleUnblockDay() {
    if (!personId || !date) return;
    setUnblocking(true);
    await withWriteAccess(async () => {
      try {
        await apiFetch(
          `/api/blockouts?personId=${encodeURIComponent(personId)}&date=${encodeURIComponent(date)}`,
          { method: "DELETE" },
        );
        setDayBlocked(false);
        setToast("Day unblocked.");
        await load(year, month);
        await loadDayFlags(personId, date);
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Unblock failed");
      } finally {
        setUnblocking(false);
      }
    });
    setUnblocking(false);
  }

  async function handleUndo() {
    const prev = undoRef.current;
    if (!prev) return;
    setCanUndo(false);
    await withWriteAccess(async () => {
      setSaving(true);
      try {
        await apiFetch("/api/activities", {
          method: "POST",
          body: JSON.stringify({
            personId: prev.personId,
            date: prev.date,
            ...prev.flags,
          }),
        });
        setPersonId(prev.personId);
        setDate(prev.date);
        setFlags(prev.flags);
        undoRef.current = null;
        setToast("Undone.");
        await load(year, month);
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Undo failed");
      } finally {
        setSaving(false);
      }
    });
  }

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  const nudge = useMemo(() => {
    if (!today || !personId || !rows.length) return null;
    const row = rows.find((r) => r.person.id === personId);
    const day = row?.days.find((d) => d.date === today);
    if (day && !day.hasActivity && !day.blocked && date === today) {
      const name = people.find((p) => p.id === personId)?.name ?? "You";
      return `${name} — today is still empty…`;
    }
    return null;
  }, [today, personId, rows, date, people]);

  // today+1 so timezone skew doesn't block evening logging
  const maxLogDate = useMemo(() => {
    if (!today) return "";
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, [today]);

  // Keep dayBlocked in sync when month grid reloads for selected day
  useEffect(() => {
    if (!personId || !date || !rows.length) return;
    const row = rows.find((r) => r.person.id === personId);
    const day = row?.days.find((d) => d.date === date);
    if (day) setDayBlocked(day.blocked);
  }, [rows, personId, date]);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-5 px-4 py-5 pb-24 sm:pb-8">
      <div>
        <h1 className="brand text-2xl font-bold sm:text-3xl">
          <button
            type="button"
            onClick={onActivitiesTitleClick}
            className="text-left"
          >
            Activities
          </button>
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          You are in control of your life. Tap a day to edit.
        </p>
      </div>

      <LogPanel
        people={people}
        personId={personId}
        date={date}
        flags={flags}
        saving={saving}
        blocked={dayBlocked}
        unblocking={unblocking}
        onPersonChange={handlePersonChange}
        onDateChange={handleDateChange}
        onFlagsChange={setFlags}
        onSave={handleSave}
        onUnblockDay={() => void handleUnblockDay()}
        maxDate={maxLogDate || undefined}
        minDate={people.find((p) => p.id === personId)?.joinDate}
        todayEmptyNudge={nudge}
      />

      {loading && rows.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">Loading month…</p>
      ) : (
        <MonthGrid
          year={year}
          month={month}
          rows={rows}
          onPrev={() => shiftMonth(-1)}
          onNext={() => shiftMonth(1)}
          onSelectDay={handleSelectDay}
          selected={personId && date ? { personId, date } : null}
          maxDate={maxLogDate || undefined}
        />
      )}

      <BlockOutPanel
        people={people}
        personId={personId}
        onPersonChange={handlePersonChange}
        onChanged={() => {
          void load(year, month);
          if (personId && date) void loadDayFlags(personId, date);
        }}
        withWriteAccess={withWriteAccess}
        onToast={setToast}
      />

      {toast === "saved" && canUndo ? (
        <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[var(--border-strong)] bg-[var(--ink)] px-4 py-2 text-sm text-[var(--surface-raised)] shadow-lg sm:bottom-6">
          <span>Saved.</span>
          <button
            type="button"
            onClick={() => void handleUndo()}
            className="underline"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => {
              setToast(null);
              setCanUndo(false);
            }}
            className="opacity-70"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ) : (
        <Toast
          message={toast === "saved" ? null : toast}
          onDismiss={() => setToast(null)}
        />
      )}
      {gate}
      <PeopleAdmin
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onChanged={() => {
          window.dispatchEvent(new Event("sally:people-changed"));
        }}
      />
    </div>
  );
}
