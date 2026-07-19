// Presentation helpers for the dashboard KPI cards.
//
// The metrics themselves — period boundaries, which statuses count, and the
// previous-period comparisons — are computed by the API
// (GET /v1/dashboard/metrics). Nothing here decides a business rule; these
// functions only turn a number the server already produced into a label.

export type TrendDirection = "up" | "down" | "flat";

/** A null delta means the API had no baseline to compare against. */
export function directionOf(delta: number | null | undefined): TrendDirection {
  if (delta === null || delta === undefined || Math.abs(delta) < 0.05) return "flat";
  return delta > 0 ? "up" : "down";
}

/** "+12%" / "−8%" / "—" when there is no baseline. */
export function formatPercentDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined) return "—";
  const rounded = Math.round(delta);
  if (rounded === 0) return "0%";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}%`;
}

/** Percentage-point delta — rates compare in p.p., never in percent. */
export function formatPointsDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined) return "—";
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return "0 p.p.";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)} p.p.`;
}

/** "2 a menos" / "3 a mais" / "igual" — absolute difference reads better than % for counts. */
export function formatCountDelta(value: number, previous: number): string {
  const diff = value - previous;
  if (diff === 0) return "igual";
  return `${Math.abs(diff)} a ${diff > 0 ? "mais" : "menos"}`;
}
