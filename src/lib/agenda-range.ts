// Date-range logic for the agenda's Dia / Semana / Mês views.
//
// Pure and local-time throughout: the range shown, how the arrows move, and the
// header label all derive from an anchor date plus the active view. Nothing here
// touches business rules — it only decides which days are on screen.

export type AgendaView = "dia" | "semana" | "mes";

export const DOW_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Monday-based, matching the pt-BR calendar. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() + 6) % 7));
}

export function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

/** Anchors to day 1 before shifting: Jan 31 + 1 month must be February, not March. */
export function addMonths(d: Date, months: number): Date {
  const x = startOfMonth(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "2026-07-18" in local time — never via toISOString(), which shifts to UTC. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * The days on screen for a view.
 *
 * - dia: the anchor alone
 * - semana: Monday through Saturday (6 columns; Sunday is not a working day here)
 * - mes: whole weeks covering the month, so the calendar grid is always
 *   rectangular — leading/trailing days belong to the neighbouring months
 */
export function daysFor(view: AgendaView, anchor: Date): Date[] {
  if (view === "dia") return [startOfDay(anchor)];
  if (view === "semana") {
    const monday = startOfWeek(anchor);
    return Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  }
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const last = addDays(addMonths(first, 1), -1);
  const gridEnd = addDays(startOfWeek(last), 6);
  const out: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Moving by one view-sized step: a day, a week, a month. */
export function shift(view: AgendaView, anchor: Date, direction: 1 | -1): Date {
  if (view === "dia") return addDays(anchor, direction);
  if (view === "semana") return addDays(anchor, 7 * direction);
  return addMonths(anchor, direction);
}

/** Header label: "18 de julho, 2026" / "13 – 18 de julho, 2026" / "Julho 2026". */
export function rangeLabel(view: AgendaView, anchor: Date): string {
  if (view === "dia") {
    return startOfDay(anchor).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  if (view === "mes") {
    const label = startOfMonth(anchor).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  const days = daysFor("semana", anchor);
  const first = days[0];
  const last = days[days.length - 1];
  // A week can straddle two months — say both rather than implying one.
  if (first.getMonth() !== last.getMonth()) {
    const f = first.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    const l = last.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    return `${f} – ${l}, ${last.getFullYear()}`;
  }
  const month = first.toLocaleDateString("pt-BR", { month: "long" });
  return `${first.getDate()} – ${last.getDate()} de ${month}, ${first.getFullYear()}`;
}
