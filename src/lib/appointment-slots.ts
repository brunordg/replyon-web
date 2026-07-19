// Helpers for the "Novo agendamento" time picker.
//
// The backend owns availability: GET /v1/availability/staff/{id}/slots takes the
// serviceId and returns only the start times where the *whole* service fits —
// so a 70-minute service on a 30-minute grid is already excluded from any start
// that lacks 3 consecutive free slots. These helpers don't recompute that; they
// derive the grid size from the returned starts so the UI can spell out what a
// chosen start actually consumes ("09:00 – 10:10 · 3 slots de 30 min").

/** "09:00:00" | "09:00" -> "09:00". Returns the input unchanged if unparseable. */
export function normalizeTime(raw: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (!m) return raw;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** Minutes since midnight, or NaN. */
export function timeToMinutes(raw: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesToTime(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const min = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function addMinutes(time: string, minutes: number): string {
  const base = timeToMinutes(time);
  if (Number.isNaN(base)) return time;
  return minutesToTime(base + minutes);
}

/**
 * The grid granularity, inferred from the smallest gap between consecutive
 * available starts. Undefined when there are fewer than two slots (a single
 * start tells us nothing about spacing) or when every gap is unparseable.
 *
 * Inferring beats reading the staff schedule's `intervalBetweenAppointments`:
 * that field is the padding *between* appointments, not the grid the backend
 * actually emits, and the two are not guaranteed to agree.
 */
export function detectSlotMinutes(slots: string[]): number | undefined {
  const mins = slots.map(timeToMinutes).filter((n) => !Number.isNaN(n));
  if (mins.length < 2) return undefined;
  const sorted = [...mins].sort((a, b) => a - b);
  let smallest = Infinity;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > 0 && gap < smallest) smallest = gap;
  }
  return Number.isFinite(smallest) ? smallest : undefined;
}

/** How many grid slots a service of `durationMinutes` occupies. */
export function slotsRequired(
  durationMinutes: number,
  slotMinutes: number | undefined,
): number | undefined {
  if (!slotMinutes || slotMinutes <= 0 || !durationMinutes || durationMinutes <= 0) {
    return undefined;
  }
  return Math.ceil(durationMinutes / slotMinutes);
}

/** "YYYY-MM-DD" in local time — never via toISOString(), which shifts to UTC. */
export function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local ISO datetime the backend expects, e.g. "2026-07-18T09:00:00". */
export function toLocalDateTime(date: Date, time: string): string {
  return `${toDateParam(date)}T${normalizeTime(time)}:00`;
}

/** "18 de julho de 2026" */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
