// Editor-side model for a staff member's working week.
//
// The API holds a flat list of windows (see ScheduleResponse); the editor
// pivots that into a per-day map so each row can be toggled and edited
// independently, including days the schedule has no window for. Everything here
// works in "HH:mm" strings to match <input type="time">; conversion to the
// wire's "HH:mm:ss" happens at the `toWeekState` / `toScheduleRequest` edges.

import { API_DAY_OF_WEEK, SCHEDULE_DAYS, SCHEDULE_DAY_BY_API } from "@/lib/api/types";
import type {
  ScheduleDay,
  ScheduleResponse,
  ScheduleWindowRequest,
  UpdateScheduleRequest,
} from "@/lib/api/types";

export const DAY_LABEL: Record<ScheduleDay, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

export const WEEKDAYS: ScheduleDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
export const WEEKEND: ScheduleDay[] = ["saturday", "sunday"];

/** A single continuous working window inside a day. */
export interface Window {
  id: string;
  start: string; // "HH:mm"
  end: string;
}

export interface DayState {
  enabled: boolean;
  windows: Window[];
}

export type WeekState = Record<ScheduleDay, DayState>;

let windowSeq = 0;
/** Windows need a stable key that survives reordering, so they carry an id. */
export function makeWindow(start: string, end: string): Window {
  windowSeq += 1;
  return { id: `w${windowSeq}`, start, end };
}

export function buildWeek(days: ScheduleDay[], windows: [string, string][]): WeekState {
  return SCHEDULE_DAYS.reduce((acc, day) => {
    const on = days.includes(day);
    acc[day] = {
      enabled: on,
      windows: on ? windows.map(([s, e]) => makeWindow(s, e)) : [makeWindow("09:00", "18:00")],
    };
    return acc;
  }, {} as WeekState);
}

export const DEFAULT_WEEK = (): WeekState =>
  buildWeek(WEEKDAYS, [
    ["09:00", "12:00"],
    ["13:00", "18:00"],
  ]);

/** "09:00:00" (LocalTime on the wire) -> "09:00" for <input type="time">. */
function toInputTime(value: string): string {
  return value.slice(0, 5);
}

/**
 * Seeds the editor from the persisted schedule, grouping the flat window list
 * by day. A day with no window renders as disabled, pre-filled with a sensible
 * default so toggling it on gives the user something to edit.
 */
export function toWeekState(schedule: ScheduleResponse): WeekState {
  const byDay = new Map<ScheduleDay, Window[]>();
  for (const w of schedule.windows ?? []) {
    const day = SCHEDULE_DAY_BY_API[w.dayOfWeek];
    if (!day) continue; // ignore any day name we don't know
    const list = byDay.get(day) ?? [];
    list.push(makeWindow(toInputTime(w.startTime), toInputTime(w.endTime)));
    byDay.set(day, list);
  }

  return SCHEDULE_DAYS.reduce((acc, day) => {
    const windows = byDay.get(day) ?? [];
    acc[day] =
      windows.length > 0
        ? { enabled: true, windows }
        : { enabled: false, windows: [makeWindow("09:00", "18:00")] };
    return acc;
  }, {} as WeekState);
}

/** Minutes since midnight, or NaN when the value is incomplete. */
export function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
}

/** "HH:mm" from minutes since midnight. */
export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  return `${String(h).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function weeklyTotalHours(week: WeekState): number {
  let total = 0;
  for (const day of SCHEDULE_DAYS) {
    if (!week[day].enabled) continue;
    for (const w of week[day].windows) {
      const span = minutes(w.end) - minutes(w.start);
      if (Number.isFinite(span) && span > 0) total += span;
    }
  }
  return total / 60;
}

/** Per-day validation: complete, ordered, and non-overlapping windows. */
export function validateWeek(week: WeekState): Partial<Record<ScheduleDay, string>> {
  const errors: Partial<Record<ScheduleDay, string>> = {};
  for (const day of SCHEDULE_DAYS) {
    const { enabled, windows } = week[day];
    if (!enabled) continue;
    if (windows.length === 0) {
      errors[day] = "Adicione ao menos uma janela.";
      continue;
    }
    if (windows.some((w) => !w.start || !w.end)) {
      errors[day] = "Preencha início e fim de todas as janelas.";
      continue;
    }
    if (windows.some((w) => minutes(w.start) >= minutes(w.end))) {
      errors[day] = "O fim deve ser depois do início.";
      continue;
    }
    const sorted = [...windows].sort((a, b) => minutes(a.start) - minutes(b.start));
    const overlaps = sorted.some((w, i) => i > 0 && minutes(w.start) < minutes(sorted[i - 1].end));
    if (overlaps) errors[day] = "As janelas não podem se sobrepor.";
  }
  return errors;
}

/**
 * Flattens the editor into the API payload: every window of every enabled day,
 * ordered by day then start time. Disabled days contribute nothing, which is
 * how the API represents "does not work that day".
 */
export function toScheduleRequest(week: WeekState, intervalMinutes: number): UpdateScheduleRequest {
  const windows: ScheduleWindowRequest[] = [];
  for (const day of SCHEDULE_DAYS) {
    if (!week[day].enabled) continue;
    const sorted = [...week[day].windows].sort((a, b) => minutes(a.start) - minutes(b.start));
    for (const w of sorted) {
      windows.push({
        dayOfWeek: API_DAY_OF_WEEK[day],
        startTime: `${w.start}:00`,
        endTime: `${w.end}:00`,
      });
    }
  }
  return { windows, intervalBetweenAppointments: intervalMinutes };
}
